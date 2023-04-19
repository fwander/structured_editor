import { ParseTree } from "../parse";
import { AST, parse_tree_to_data } from "../ast";
import { Visitor } from "./visitor";
function no_tree(tree: ParseTree){return undefined;}
export const factory_tbl: (((tree: ParseTree) => AST | undefined))[] = [
make_S_AST,
no_tree,
no_tree,
make_expr_AST,
make_number_AST,
make_op_AST,
make_opexpr_AST,
no_tree,
make_keyword_AST,
no_tree,
make_id_AST,
make_color_AST,
]
export class S_AST extends AST {
	accept = (v: Visitor<any, any>, env: any) => v.visit_S_AST(this, env);
	exprsList(): null|((null)|([(expr_AST|null),string,undefined,]))[] {
		let looking_at = super.get_data();
		switch (looking_at.variant) {
			case 0:
				looking_at = looking_at.children[0];
				return parse_tree_to_data(looking_at);
			default:
				return null;
		}
	}
	nthExpr(n0=0,): null|(expr_AST|null) {
		let looking_at = super.get_data();
		switch (looking_at.variant) {
			case 0:
				looking_at = looking_at.children[0];
					for (let i = 1; i < n0; i++){looking_at=looking_at.children[0];}looking_at=looking_at.children[looking_at.children.length-1];
					switch (looking_at.variant) {
						case 0:
							looking_at = looking_at.children[0];
							return parse_tree_to_data(looking_at);
						default:
							return null;
					}
			default:
				return null;
		}
	}
}
export function make_S_AST(tree: ParseTree): S_AST {
	return new S_AST(tree);
}
export class expr_AST extends AST {
	accept = (v: Visitor<any, any>, env: any) => v.visit_expr_AST(this, env);
	num(): null|(number_AST|null) {
		let looking_at = super.get_data();
		switch (looking_at.variant) {
			case 1:
				looking_at = looking_at.children[0];
				return parse_tree_to_data(looking_at);
			default:
				return null;
		}
	}
	col(): null|(color_AST|null) {
		let looking_at = super.get_data();
		switch (looking_at.variant) {
			case 2:
				looking_at = looking_at.children[0];
				return parse_tree_to_data(looking_at);
			default:
				return null;
		}
	}
	opact(): null|(opexpr_AST|null) {
		let looking_at = super.get_data();
		switch (looking_at.variant) {
			case 0:
				looking_at = looking_at.children[0];
				return parse_tree_to_data(looking_at);
			default:
				return null;
		}
	}
}
export function make_expr_AST(tree: ParseTree): expr_AST {
	return new expr_AST(tree);
}
export class number_AST extends AST {
	accept = (v: Visitor<any, any>, env: any) => v.visit_number_AST(this, env);
	text(): null|(string|null) {
		let looking_at = super.get_data();
		switch (looking_at.variant) {
			case 0:
				looking_at = looking_at.children[0];
				return parse_tree_to_data(looking_at);
			default:
				return null;
		}
	}
}
export function make_number_AST(tree: ParseTree): number_AST {
	return new number_AST(tree);
}
export class op_AST extends AST {
	accept = (v: Visitor<any, any>, env: any) => v.visit_op_AST(this, env);
	kw(): null|(keyword_AST|null) {
		let looking_at = super.get_data();
		switch (looking_at.variant) {
			case 0:
				looking_at = looking_at.children[0];
				return parse_tree_to_data(looking_at);
			default:
				return null;
		}
	}
	name(): null|(id_AST|null) {
		let looking_at = super.get_data();
		switch (looking_at.variant) {
			case 1:
				looking_at = looking_at.children[0];
				return parse_tree_to_data(looking_at);
			default:
				return null;
		}
	}
}
export function make_op_AST(tree: ParseTree): op_AST {
	return new op_AST(tree);
}
export class opexpr_AST extends AST {
	accept = (v: Visitor<any, any>, env: any) => v.visit_opexpr_AST(this, env);
	action(): null|(op_AST|null) {
		let looking_at = super.get_data();
		switch (looking_at.variant) {
			case 0:
				looking_at = looking_at.children[1];
				return parse_tree_to_data(looking_at);
			default:
				return null;
		}
	}
	args(): null|((expr_AST|null))[] {
		let looking_at = super.get_data();
		switch (looking_at.variant) {
			case 0:
				looking_at = looking_at.children[2];
				return parse_tree_to_data(looking_at);
			default:
				return null;
		}
	}
}
export function make_opexpr_AST(tree: ParseTree): opexpr_AST {
	return new opexpr_AST(tree);
}
export class keyword_AST extends AST {
	accept = (v: Visitor<any, any>, env: any) => v.visit_keyword_AST(this, env);
	word(): null|((((((null)|(string))|(string))|(string))|(string))|(string))|(string) {
		let looking_at = super.get_data();
		switch (looking_at.variant) {
			case 0:
				looking_at = looking_at.children[0];
				return parse_tree_to_data(looking_at);
			default:
				return null;
		}
	}
}
export function make_keyword_AST(tree: ParseTree): keyword_AST {
	return new keyword_AST(tree);
}
export class id_AST extends AST {
	accept = (v: Visitor<any, any>, env: any) => v.visit_id_AST(this, env);
	text(): null|(string|null) {
		let looking_at = super.get_data();
		switch (looking_at.variant) {
			case 0:
				looking_at = looking_at.children[0];
				return parse_tree_to_data(looking_at);
			default:
				return null;
		}
	}
}
export function make_id_AST(tree: ParseTree): id_AST {
	return new id_AST(tree);
}
export class color_AST extends AST {
	accept = (v: Visitor<any, any>, env: any) => v.visit_color_AST(this, env);
	text(): null|(string|null) {
		let looking_at = super.get_data();
		switch (looking_at.variant) {
			case 0:
				looking_at = looking_at.children[0];
				return parse_tree_to_data(looking_at);
			default:
				return null;
		}
	}
}
export function make_color_AST(tree: ParseTree): color_AST {
	return new color_AST(tree);
}
