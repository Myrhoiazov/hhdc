export interface PersonTicket {
    id: string;
    ticketType: string;
    barcode: string | null;
    status: string;
    price: string | null;
    listPrice: string | null;
    serviceFee: string | null;
    couponCode: string | null;
    downloadUrl: string | null;
    event: { id: string; name: string } | null;
    checkedIn: boolean;
    heldByPerson: boolean;
}

export interface PersonOrder {
    id: string;
    externalId: string | null;
    status: string;
    currency: string;
    subtotal: string | null;
    fees: string | null;
    total: string | null;
    orderedAt: string;
    shopName: string | null;
    answers: { name: string; value: string }[];
    downloadUrl: string | null;
    event: { id: string; name: string } | null;
    boughtByPerson: boolean;
    tickets: PersonTicket[];
    payments: {
        id: string;
        amount: string | null;
        currency: string;
        status: string;
        method: string | null;
        paidAt: string | null;
    }[];
}
