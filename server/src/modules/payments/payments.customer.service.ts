import prisma from '../../../prisma/prisma-client'


export interface TCustomer {
    email: string
    givenName: string
    familyName: string
    payerName?: string
    payerRelation?: string
    clientId?: number | string | null
    // Fields below belong to the later customer-edit/bank-details flow.
    id?: number;
    mollieId?: string
    city?: string
    country?: string
    phone?: string
    consumerName?: string
    postalCode?: string
    streetAndNumber?: string
    consumerAccount?: string
    consumerBic?: string
}

export const getCostomerByMollieId = async (id: string) => {
    return await prisma.customer.findUnique({
        where: {
            mollieId: id
        }
    })

}
