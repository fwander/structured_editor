import { ParseTree, ptree_str } from "../parse";
import { AST } from "../ast";
function no_tree(tree: ParseTree) {
	return undefined;
}
export const factory_tbl: (((tree: ParseTree) => AST | undefined))[] = [
make_S_AST,
no_tree,
no_tree,
make_expr_AST,
no_tree,
no_tree,
no_tree,
make_op_AST,
]
export class S_AST extends AST {
nthExpr(n0=0,): any  {
let looking_at = super.get_data();
// if (!super.data) {
// 	console.log("undef data on nthExpr :(");
// 	console.log(super.children());
// }
switch (looking_at.variant) {
case 0:
	looking_at = looking_at.children[0];
		for (let i = 0; i < n0; i++){looking_at=looking_at.children[0];}looking_at=looking_at.children[looking_at.children.length-1];
		return looking_at;
default:
	return null;}
}

}
export function make_S_AST(tree: ParseTree): S_AST {
	console.log("Making S_AST");
	console.log(ptree_str(tree));
	return new S_AST(tree);
}
export class expr_AST extends AST {
}
export function make_expr_AST(tree: ParseTree): expr_AST {
	return new expr_AST(tree);
}
export class op_AST extends AST {
}
export function make_op_AST(tree: ParseTree): op_AST {
	return new op_AST(tree);
}

