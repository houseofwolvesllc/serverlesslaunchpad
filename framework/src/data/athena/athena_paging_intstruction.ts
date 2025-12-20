import { PagingInstruction } from "@houseofwolves/serverlesslaunchpad.commons";

export class AthenaPagingInstruction extends PagingInstruction {
    cursor?: string;
    direction?: "forward" | "backward";
}
