import { ParseTree } from "../parse";
import { AST } from "../ast";
export const factory_tbl: (((tree: ParseTree) => AST) | undefined)[] = [
make_S_AST,
undefined,
undefined,
]
export class S_AST extends AST {
name(n0=0,): any  {
let looking_at = super.data;
switch (looking_at.variant) {
case 2:
	looking_at = looking_at.children[0];
	return looking_at;
case 0:
	looking_at = looking_at.children[0];
		for (let i = 0; i < n0; i++){looking_at=looking_at.children[0];}looking_at=looking_at.children[looking_at.children.length-1];
		return looking_at;
case 1:
	looking_at = looking_at.children[0];
	return looking_at;
default:
	return null;}
}

}
export function make_S_AST(tree: ParseTree): S_AST {
	return new S_AST(tree);
}

