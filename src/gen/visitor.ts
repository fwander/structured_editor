import { AST } from "../ast";
import { number_AST, keyword_AST, expr_AST, S_AST, color_AST, id_AST, op_AST, opexpr_AST, } from "./ast_gen";
export abstract class Visitor<ResultType, EnvType> {
	protected abstract noVal: ResultType;
	protected abstract noEnv: EnvType;
	abstract visit_number_AST(node: number_AST, env: EnvType): ResultType;
	abstract visit_keyword_AST(node: keyword_AST, env: EnvType): ResultType;
	abstract visit_expr_AST(node: expr_AST, env: EnvType): ResultType;
	abstract visit_S_AST(node: S_AST, env: EnvType): ResultType;
	abstract visit_color_AST(node: color_AST, env: EnvType): ResultType;
	abstract visit_id_AST(node: id_AST, env: EnvType): ResultType;
	abstract visit_op_AST(node: op_AST, env: EnvType): ResultType;
	abstract visit_opexpr_AST(node: opexpr_AST, env: EnvType): ResultType;
}