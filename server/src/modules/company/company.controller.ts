import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import * as mollieService from '../payments/payments.mollie.service';

const nullableText = z.string().trim().max(191).nullable().optional().or(z.literal(''));
export const organizationSchema = z.object({
    legalName: z.string().trim().min(1).max(191),
    kvkNumber: nullableText,
    vatNumber: nullableText,
    registrationAddress: nullableText,
    postalCode: nullableText,
    city: nullableText,
    countryCode: z.string().trim().min(2).max(2).default('NL'),
    email: nullableText,
    phone: nullableText,
    website: nullableText,
    bankName: nullableText,
    iban: nullableText,
    mollieOrganizationId: nullableText,
});
export const brandSchema = z.object({
    organizationId: z.coerce.number().int().positive(),
    name: z.string().trim().min(1).max(191),
    slug: z.string().trim().min(1).max(191).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    logoUrl: z.string().trim().max(191).regex(/^(https?:\/\/|\/upload\/brands\/)/).nullable().optional().or(z.literal('')),
    primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default('#1d1d33'),
    email: nullableText,
    phone: nullableText,
    website: nullableText,
    address: nullableText,
    mollieProfileId: nullableText,
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true),
});
export const emptyToNull = <T extends Record<string, unknown>>(value: T): T => Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, nested === '' ? null : nested]),
) as T;

// client/src/pages/OrganizationBrandsPage/organizationBrandsTypes.ts: Organization/Brand — neither
// type reads createdAt/updatedAt.
const organizationSelect = {
    id: true,
    legalName: true,
    kvkNumber: true,
    vatNumber: true,
    registrationAddress: true,
    postalCode: true,
    city: true,
    countryCode: true,
    email: true,
    phone: true,
    website: true,
    bankName: true,
    iban: true,
    mollieOrganizationId: true,
} satisfies Prisma.LegalOrganizationSelect;

const organizationBrandSelect = {
    id: true,
    organizationId: true,
    name: true,
    slug: true,
    logoUrl: true,
    primaryColor: true,
    email: true,
    phone: true,
    website: true,
    address: true,
    mollieProfileId: true,
    isDefault: true,
    isActive: true,
} satisfies Prisma.BusinessBrandSelect;

export const getOrganization = async (_req: Request, res: Response) => {
    const organization = await prisma.legalOrganization.findFirst({
        select: {
            ...organizationSelect,
            brands: { select: organizationBrandSelect, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
        },
        orderBy: { id: 'asc' },
    });
    return res.json(organization);
};

export const upsertOrganization = async (req: Request, res: Response) => {
    const parsed = organizationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Проверьте реквизиты организации', details: parsed.error.flatten() });
    const existing = await prisma.legalOrganization.findFirst({ orderBy: { id: 'asc' } });
    const data = emptyToNull(parsed.data) as Prisma.LegalOrganizationUncheckedCreateInput;
    const organization = existing
        ? await prisma.legalOrganization.update({ where: { id: existing.id }, data })
        : await prisma.legalOrganization.create({ data });
    return res.status(existing ? 200 : 201).json(organization);
};

export const syncOrganizationFromMollie = async (_req: Request, res: Response) => {
    const profile = await mollieService.getProfile();
    const existing = await prisma.legalOrganization.findFirst({ orderBy: { id: 'asc' } });
    const profileData = profile as typeof profile & { email?: string; phone?: string; website?: string };
    const organization = existing
        ? await prisma.legalOrganization.update({
            where: { id: existing.id },
            data: {
                legalName: existing.legalName || profile.name,
                email: existing.email ?? profileData.email ?? null,
                phone: existing.phone ?? profileData.phone ?? null,
                website: existing.website ?? profile.website ?? null,
            },
        })
        : await prisma.legalOrganization.create({
            data: {
                legalName: profile.name,
                email: profileData.email ?? null,
                phone: profileData.phone ?? null,
                website: profile.website ?? null,
            },
        });
    return res.json({ organization, mollieProfile: profile });
};

// Client only reads organization.{registrationAddress,postalCode,city} as an address fallback
// (see client/src/pages/InvoicesPage/ui/CreateInvoiceModal/useCreateInvoiceModal.ts:brandAddress)
// — narrower than the full LegalOrganization, which every brand row would otherwise duplicate.
const brandOrganizationSelect = {
    select: { registrationAddress: true, postalCode: true, city: true },
};

export const getBrands = async (_req: Request, res: Response) => {
    const brands = await prisma.businessBrand.findMany({
        include: { organization: brandOrganizationSelect },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return res.json(brands);
};

const saveBrand = async (data: z.infer<typeof brandSchema>, id?: number) => prisma.$transaction(async (transaction) => {
    if (data.isDefault) {
        await transaction.businessBrand.updateMany({
            where: { organizationId: data.organizationId, ...(id ? { id: { not: id } } : {}) },
            data: { isDefault: false },
        });
    }
    const savedData = emptyToNull(data) as Prisma.BusinessBrandUncheckedCreateInput;
    return id
        ? transaction.businessBrand.update({ where: { id }, data: savedData })
        : transaction.businessBrand.create({ data: savedData });
});

export const createBrand = async (req: Request, res: Response) => {
    const parsed = brandSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Проверьте данные бренда', details: parsed.error.flatten() });
    return res.status(201).json(await saveBrand(parsed.data));
};

export const updateBrand = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = brandSchema.safeParse(req.body);
    if (!id || !parsed.success) return res.status(400).json({ message: 'Проверьте данные бренда' });
    return res.json(await saveBrand(parsed.data, id));
};

export const archiveBrand = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Некорректный бренд' });
    const brand = await prisma.businessBrand.update({
        where: { id },
        data: { isActive: false, isDefault: false },
    });
    return res.json(brand);
};

// One endpoint (/company/branches) feeds both the full BranchesPage CRUD view and several
// lightweight dropdowns (ClientTypeTabs, useClientForm, useEditClientModal,
// useGroupFormReferenceData, useCreateInvoiceModal) — this is the union of fields any consumer
// reads; createdAt/updatedAt are never used on the client.
const branchSelect = {
    id: true,
    name: true,
    address: true,
    city: true,
    phone: true,
    email: true,
    description: true,
    isActive: true,
} satisfies Prisma.BranchSelect;

export const getBranches = async (_req: Request, res: Response) => {
    const branches = await prisma.branch.findMany({ select: branchSelect, orderBy: { createdAt: 'asc' } });
    return res.json(branches);
};

export const getBranchById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const branch = await prisma.branch.findUnique({ where: { id }, select: branchSelect });
    if (!branch) return res.status(404).json({ message: 'Not found' });
    return res.json(branch);
};

export const createBranch = async (req: Request, res: Response) => {
    const { name, address, city, phone, email, description } = req.body;
    if (!name) return res.status(400).json({ message: 'name required' });
    const branch = await prisma.branch.create({
        data: { name, address, city, phone, email, description },
    });
    return res.status(201).json(branch);
};

export const updateBranch = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { name, address, city, phone, email, description, isActive } = req.body;
    const branch = await prisma.branch.update({
        where: { id },
        data: { name, address, city, phone, email, description, isActive },
    });
    return res.json(branch);
};

export const deleteBranch = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await prisma.branch.delete({ where: { id } });
    return res.json({ ok: true });
};
