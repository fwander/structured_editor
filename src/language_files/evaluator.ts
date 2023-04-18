import { Visitor } from "../gen/visitor"
import { S_AST, color_AST, expr_AST, id_AST, keyword_AST, number_AST, op_AST, opexpr_AST } from "../gen/ast_gen"
import * as paper from 'paper';

type EvaluationResult = paper.Path | paper.Shape | number | string | undefined;

function parse_color(str: EvaluationResult): paper.Color {
    switch((str ?? "BLACK") as string) {
        case "BLACK":
            return new paper.Color(0, 0, 0);
        case "RED":
            return new paper.Color(1, 0, 0);
    }
    return new paper.Color(0, 0, 1);
}

export class EvaluatorVisitor extends Visitor<EvaluationResult, undefined> {
    constructor(canvas: HTMLCanvasElement) {
        super();
        paper.setup(canvas);
        paper.view.onFrame = function(event: any) {

        };
        this.group = new paper.Group();
    }
    private group: paper.Group;
    protected noVal: EvaluationResult;
    protected noEnv: undefined;
    visit_expr_AST(node: expr_AST, env: undefined): EvaluationResult {
        return node.col()?.accept(this, undefined) ?? node.num()?.accept(this, undefined) ?? node.opact()?.accept(this, undefined);
    }
    visit_opexpr_AST(node: opexpr_AST, env: undefined): EvaluationResult {
        let op_name = node.action()?.accept(this, undefined) ?? "";
        let list = node.args() ?? [];
        
        switch (op_name) {
            case "rect":
                console.log(list);
                let arg1 = (list[0]?.accept(this, undefined) as number) ?? 10;
                let arg2 = (list[1]?.accept(this, undefined) as number) ?? 10;
                let arg3 = parse_color(list[2]?.accept(this, undefined));

                console.log('arrrg');
                console.log(arg1);
                console.log(arg2);


                new paper.Path.Rectangle({
                    center   : paper.view.center,
                    size     : new paper.Size(arg1,arg2),
                    fillColor: 'orange',
                });

                return undefined;
            case "circle":
                let center = new paper.Point(0, 0);
                let radius = (list[0]?.accept(this, undefined) as number) ?? 10;
                let circ = new paper.Path.Circle(center, radius);
                return circ;
            case "rotate":
                let shape = (list[0]?.accept(this, undefined) as paper.Shape);
                let angle = (list[1]?.accept(this, undefined) as number);
                shape.rotate(angle);
                return shape;
            case "translate":
                let operand = (list[0]?.accept(this, undefined) as paper.Shape);
                let x = (list[1]?.accept(this, undefined) as number);
                let y = (list[2]?.accept(this, undefined) as number);
                operand.translate(new paper.Point(x, y));
                return operand;
        }
    }
    visit_id_AST(node: id_AST, env: undefined): EvaluationResult {
        return node.text() ?? "";
    }
    visit_op_AST(node: op_AST, env: undefined): EvaluationResult {
        return node.kw()?.accept(this, undefined) ?? node.name()?.accept(this, undefined);
    }
    visit_keyword_AST(node: keyword_AST, env: undefined): EvaluationResult {
        return node.word() ?? "";
    }
    visit_S_AST(node: S_AST, env: undefined): EvaluationResult {
        paper.project.clear();
        let list = node.exprsList();
        if (!list) {
            return undefined;
        }

        list.forEach(element => {
            if (element && element[0]) {
                let shape = element[0].accept(this, undefined) as paper.Shape;
                console.log(shape);
            }
        });
        console.log(paper.view.isVisible());
        console.log(paper.view.isInserted());
        console.log(paper.view);
        paper.view.update();
        return undefined;
    }
    visit_color_AST(node: color_AST, env: undefined): EvaluationResult {
        return node.text() ?? "";
    }
    visit_number_AST(node: number_AST, env: undefined): EvaluationResult {
        return +(node.text() ?? "0"); 
    }
}