export abstract class PagingInstruction {
    size = 100;
}

export abstract class PagingInstructions {
    abstract previous?: PagingInstruction;
    abstract current?: PagingInstruction;
    abstract next?: PagingInstruction;
}

export interface Paginated<T> {
    items: T[];
    pagingInstructions: PagingInstructions;
}
