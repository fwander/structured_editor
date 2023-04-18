import { expr_AST, opexpr_AST, id_AST, op_AST, keyword_AST, S_AST, color_AST, number_AST } from "~/gen/ast_gen";
import { Visitor } from "../gen/visitor"

export class SerializerVisitor extends Visitor<string, undefined> {
    protected noVal: string = "";
    protected noEnv: undefined;
    visit_expr_AST(node: expr_AST, env: undefined): string {
        return node.col()?.accept(this, undefined) ?? node.num()?.accept(this, undefined) ?? node.opact()?.accept(this, undefined);
    }
    visit_opexpr_AST(node: opexpr_AST, env: undefined): string {
        return "(" + (node.action()?.accept(this, undefined) ?? "") + " " + (node.args()?.filter(a => a).map(a => a!.accept(this, undefined) as string) ?? [])
        .reduce((a, b) => a + " " + b, "") + ")";
    }
    visit_id_AST(node: id_AST, env: undefined): string {
        return node.text() ?? "";
    }
    visit_op_AST(node: op_AST, env: undefined): string {
        return node.kw()?.accept(this, undefined) ?? node.name()?.accept(this, undefined);
    }
    visit_keyword_AST(node: keyword_AST, env: undefined): string {
        return node.word() ?? "";
    }
    visit_S_AST(node: S_AST, env: undefined): string {
        let list = node.exprsList();
        if (!list) {
            return "";
        }

        let accum = "";
        for (let i = 0; i < list.length; i++) {
            if (!list[i] || !list[i]![0]) {
                continue
            }
            accum += list[i]![0]!.accept(this, undefined) + ";\n";
        }
        return accum;
    }
    visit_color_AST(node: color_AST, env: undefined): string {
        return node.text() ?? "";
    }
    visit_number_AST(node: number_AST, env: undefined): string {
        return node.text() ?? "";
    }

}