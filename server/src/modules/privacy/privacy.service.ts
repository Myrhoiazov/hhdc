import prisma from '../../../prisma/prisma-client';

export async function exportPersonData(personId: string) {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      registrations: {
        include: {
          event: true,
          ticket: true,
        },
      },
      orders: {
        include: {
          items: true,
          payments: true,
        },
      },
      tickets: true,
      activities: true,
      conversations: {
        include: {
          messages: true,
        },
      },
      roles: true,
      tags: {
        include: {
          tag: true,
        }
      }
    },
  });

  if (!person) {
    throw new Error('Person not found');
  }

  return person;
}

export async function anonymizePerson(personId: string, actorUserId?: string) {
  const person = await prisma.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new Error('Person not found');
  }

  if (person.status === 'ARCHIVED' && person.firstName === 'Anonymized') {
    throw new Error('Person is already anonymized');
  }

  const result = await prisma.$transaction(async (tx: any) => {
    // 1. Anonymize the person record
    const anonymized = await tx.person.update({
      where: { id: personId },
      data: {
        firstName: 'Anonymized',
        lastName: 'User',
        displayName: 'Anonymized User',
        email: null,
        phone: null,
        birthDate: null,
        notes: null,
        status: 'ARCHIVED',
        // Depending on requirements, we might want to anonymize language/country too,
        // but often country is useful for macro analytics and not PII without other context.
      },
    });

    // 2. Anonymize buyer reference in Orders if necessary? The schema has buyerPersonId.
    // The requirement says "keeping Order/Ticket non-PII financial history for reporting."
    // Keeping buyerPersonId is fine since the Person itself is anonymized.
    
    // 3. Create AuditLog
    await tx.auditLog.create({
      data: {
        actorUserId: actorUserId, // if performed by admin
        action: 'GDPR_ANONYMIZE',
        entityType: 'Person',
        entityId: personId,
        before: {
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          phone: person.phone,
        } as any,
        after: {
          status: 'ARCHIVED',
          firstName: 'Anonymized',
        } as any,
      },
    });

    return anonymized;
  });

  return result;
}
