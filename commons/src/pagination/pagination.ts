export interface PagingInstruction {
    limit?: number;
}

export interface PagingInstructions {
    previous?: PagingInstruction;
    current?: PagingInstruction;
    next?: PagingInstruction;
}

export interface Paginated<T> {
    items: T[];
    pagingInstructions: PagingInstructions;
}
