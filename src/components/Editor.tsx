
import { createSignal, createEffect, JSX, Component } from "solid-js";
import { grammar_start, is_list, is_term, Symbol } from "~/gen/grammar";
import { add_render_info, concreteify, decompose, defaultParseTree, get_root, ParseTree, ptree_less_shallow, ptree_shallow, ptree_str, new_reparse, retokenize, tokenize, deep_copy, reset_focus } from "~/parse";
import { Tree } from "./Tree";
import { child, is_box, lca_prevcousin, nav_left, next_sibling, parent, nav_right, prev_sibling, lca_nav_left } from "~/navigate";
import { S_AST } from "~/gen/ast_gen";
// import { SerializerVisitor } from "~/language_files/serializer";
import { EvaluatorVisitor } from "~/language_files/evaluator";
import * as paper from 'paper';

let global_cursor_index = 0;
let height = 0;

function getNthLeaf(n: number, root: ParseTree): ParseTree | undefined {
    if (n === 0 && root.children.length === 0) {
        return root;
    }
    
    for (let i = 0; i < root.children.length; i++) {
        if (n < root.children[i].render_info!.size) {
            return getNthLeaf(n, root.children[i]);
        }
        n -= root.children[i].render_info!.size;
    }

    return undefined;
}

function getTreeWithCoords(root: ParseTree, leaf_ind: number, leaf_height: number): ParseTree | undefined {
    let tokTree = getNthLeaf(leaf_ind, root);
    if (tokTree === undefined) {
        alert("AAAHHH");
        return undefined;
    }

    for (let i = 0; i < leaf_height && tokTree.render_info!.parent; i++) {
        tokTree = tokTree.render_info!.parent;
    }

    return tokTree;
}

function getLeafInd(node: ParseTree): [number, ParseTree] {
    let nPrev: number = 0;
    let parent = node.render_info!.parent;
    while (parent) {
        let ind: number = parent.children.indexOf(node);
        for(let i = 0; i < ind; i++) {
            nPrev += parent.children[i].render_info!.size;
        }

        node = parent;
        parent = node.render_info!.parent;
    }
    return [nPrev, node];
}

function getHeight(node: ParseTree): number {
    let depth: number = 0;
    while (node.children.length !== 0) {
        depth++;
        node = node.children[0];
    }
    return depth;
}

function getCoords(node: ParseTree): [number, number, ParseTree] {
    let [w, ptre] = getLeafInd(node);
    return [w, getHeight(node), ptre];
}

function isAlphaNumeric(str: string) {
    var code, i, len;
  
    for (i = 0, len = str.length; i < len; i++) {
      code = str.charCodeAt(i);
      if (!(code > 47 && code < 58) && // numeric (0-9)
          !(code > 64 && code < 91) && // upper alpha (A-Z)
          !(code > 96 && code < 123)) { // lower alpha (a-z)
        return false;
      }
    }
    return true;
  };

let new_word = false;

function set_focus_flag(tree: ParseTree) {
    if (!tree.render_info) {
        tree.render_info = {
            reactiveSet: (x)=>{},
            last_selected: 0,
            cursor_index: -1,
            size: 0,
            focus_flag: true,
            parent: tree,
        }
    }
    else {
        tree.render_info!.focus_flag = true;
        tree.render_info!.cursor_index = -1;
    }
}

let clipboard: ParseTree | undefined;

// null if can't make edit
function getTarget(event: KeyboardEvent, cursor: ParseTree): ParseTree | null | boolean {
    if (!cursor) {
        return null;
    }
    let adding_char = "";
    let insert_mode = insertMode();
    if (event.key === "v" && event.ctrlKey && clipboard && cursor.render_info?.parent) {
        let adding = deep_copy(clipboard);
        set_focus_flag(adding)
        let target = cursor.render_info.parent;
        if (insert_mode) {
            target.children.splice(target.render_info!.cursor_index,0,adding);
        }
        else {
            target.children.splice(target.children.indexOf(cursor),1,adding);
        }
        return target;
    }
    if (!cursor || !cursor.render_info || event.ctrlKey || event.altKey || !insert_mode) {
        return null;
    }
    if (event.key.length === 1) {
        adding_char = event.key;
    }
    if (adding_char == ' ') {
        new_word = true;
        return null;
    }
    if (!adding_char) {
        if (event.key != "Backspace") {
            return null;
        }
    }
    let stream: ParseTree[] = [];
    let target: ParseTree;
    if (adding_char.length !== 0) { //addition
        if (cursor.children.length === 0 && !cursor.token) { 
            // cursor is an imagined non term if these are true
            let result = tokenize(event.key);
            target = cursor;
            target.children  = result;
            if (result.length !== 0) {
                set_focus_flag(result[result.length-1]);
            }
            return target;
        }
        const parent = cursor.render_info.parent;
        if (!parent) {
            return null;
        }
        target = parent;
        let index = parent.children.indexOf(cursor);
        if (is_term(cursor.data) && cursor.token) {
            const cursor_index = cursor.render_info.cursor_index;
            const token = cursor.token;
            if (new_word) {
                let result = tokenize(adding_char)
                if (result.length !== 0) {
                    set_focus_flag(result[result.length-1]);
                }
                target.children.splice(index+1,0,...result);
                target.children = target.children.filter((x)=>!is_box(x));
                return target;
            }
            let result = tokenize(token.slice(0,cursor_index) + adding_char + token.slice(cursor_index))
            if (result.length === 1 && result[0].data === cursor.data) {
                result[0].render_info = cursor.render_info;
                target.children[index] = result[0];
                setFocusedNode(result[0]);
                result[0].render_info.cursor_index++;
                result[0].render_info.reactiveSet(result[0]);
                return true;
            }
            if (result.length !== 0) {
                if (cursor_index === 0) {
                    set_focus_flag(result[0]);
                }
                else {
                    set_focus_flag(result[result.length-1]);
                }
            }
            target.children.splice(index,1,...result);
            target.children = target.children.filter((x)=>!is_box(x));
        }
        else {
            let delta = 1;
            console.log("cursor index");
            console.log(cursor.render_info?.cursor_index);
            if (cursor.render_info.cursor_index === 0) {
                delta = 0;
            }
            let result = tokenize(adding_char);
            if (result.length !== 0) {
                set_focus_flag(result[result.length-1]);
            }
            target.children.splice(index+delta,0,...result);
            target.children = target.children.filter((x)=>!is_box(x));
        }
    } 
    else { //deletion
        const parent = cursor.render_info.parent;
        if (!parent) {
            return null;
        }
        target = parent;
        return del(cursor, target);
    }
    return target;
}

function obliterate(target: ParseTree) {
    let prev = target;
    outer:
    while(true) {
        prev = target;
        target = target.render_info!.parent!;
        if (!target.render_info?.parent) {
            break;
        }
        for (const sibling of target.children) {
            if (!is_box(sibling) && sibling !== prev) {
                break outer; //sorry
            }
        }
    }
    let index = target.children.indexOf(prev);
    let focused = nav_left(prev);
    set_focus_flag(focused);
    target.children.splice(index,1);
    target.children = target.children.filter((x)=>!is_box(x));
    return target;
}

function del(cursor: ParseTree, parent: ParseTree) {
    if (!cursor.render_info || !cursor.render_info.parent) {
        return cursor;
    }
    if (is_term(cursor.data) && cursor.token !== undefined) {
        let index = cursor.render_info.parent.children.indexOf(cursor);
        if (cursor.render_info.cursor_index !== 0) {
            const cursor_index = cursor.render_info.cursor_index;
            const token = cursor.token;
            if (token.length === 1) {
                return obliterate(cursor);
            }
            let result = tokenize(token.slice(0,cursor_index-1) + token.slice(cursor_index))
            if (result.length === 1 && result[0].data === cursor.data) {
                parent.children[index] = result[0];
                result[0].render_info = cursor.render_info;
                result[0].render_info.cursor_index--;
                result[0].render_info.reactiveSet(result[0]);
                setFocusedNode(result[0]);
                return true;
            }
            set_focus_flag(result[result.length-1]);
            parent.children.splice(index,1,...result);
            return parent;
        }
        else {
            const res = lca_nav_left(cursor);
            const [lca, cursor_depth, prev, prev_depth] = res;
            console.log("del!!!");
            console.log(ptree_str(lca));
            console.log(ptree_str(prev));
            if (is_term(prev.data) && prev.token !== undefined) {
                const token_stream = tokenize(prev.token.concat(cursor.token));
                let can_tokenize = true;
                if (token_stream.length !== 1) {
                    can_tokenize = false;
                }
                if (can_tokenize && token_stream[0].data === Symbol.unknown) {
                    can_tokenize = false;
                }
                if (can_tokenize) {
                    const depth = Math.max(prev_depth,cursor_depth);
                    const [new_stream, , ] = decompose(lca,depth,undefined);
                    cursor.children = new_stream;
                    return parent;
                }
            }
            const nav_prev = nav_left(cursor);
            if (nav_prev === cursor) {
                return cursor;
            }
            return obliterate(nav_left(cursor));
        }
    }
    else if (cursor.children.length !== 0) {
        if (cursor.render_info.cursor_index === 1) {
            return obliterate(cursor);
        }
        else {
            const nav_prev = nav_left(cursor);
            if (nav_prev === cursor) {
                return cursor;
            }
            return obliterate(nav_left(cursor));
        }
    }
    else if (is_box(cursor)) {
        const left_sibling = prev_sibling(cursor);
        const right_sibling = next_sibling(cursor);
        if (left_sibling === right_sibling) {
            return obliterate(cursor);
        }
        if (!left_sibling.token) {
            return obliterate(left_sibling)
        }
        if (!right_sibling.token || right_sibling === cursor) {
            left_sibling.token.substring(0,left_sibling.token.length-1);
            if (left_sibling.token.length === 0) {
                return obliterate(left_sibling);
            }
            return parent;
        }
        const token_stream = tokenize(left_sibling.token.concat(right_sibling.token));
        let can_tokenize = true;
        if (token_stream.length !== 1) {
            can_tokenize = false;
        }
        if (can_tokenize && token_stream[0].data === Symbol.unknown) {
            can_tokenize = false;
        }
        if (can_tokenize) {
            const index = cursor.render_info.parent.children.indexOf(cursor);
            cursor.children.splice(index,2,token_stream[0]);
            return cursor;
        }
        else {
            const nav_prev = nav_left(cursor);
            if (nav_prev === cursor) {
                return cursor;
            }
            return obliterate(nav_left(cursor));
        }
    }
    return cursor;
}

// const printer = new SerializerVisitor();

let evaluator: EvaluatorVisitor;
let canvas: HTMLCanvasElement;

export const [insertMode, setInsertMode] = createSignal<boolean>(false);
export const [focusedNode, setFocusedNode] = createSignal<ParseTree>(defaultParseTree);
export const Editor: Component = () => {
//   const [tree, setTree] = createSignal<ParseTree>(defaultParseTree);

  const handleFocus = (node: ParseTree) => {
    setFocusedNode(node);
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (focusedNode()) {
        if (event.key === "c" && event.ctrlKey) {
            clipboard = focusedNode();
            return;
        }
    if (event.key === "ArrowUp") {
        setFocusedNode(parent(focusedNode()));
      }
    else if (event.key === "ArrowDown") {
        setFocusedNode(child(focusedNode()));
    }
    else if (event.key === "ArrowLeft") {
        if (insertMode()) {
            if (is_box(focusedNode()) || 
                (focusedNode().children.length!==0 && focusedNode().render_info?.cursor_index===0) 
                ||focusedNode().render_info?.cursor_index === 0) {
                setFocusedNode(nav_left(focusedNode()))
                //if (focusedNode().token) {
                    let clone = ptree_shallow(focusedNode());
                    clone.render_info!.cursor_index = clone.token?.length ?? 1;
                    focusedNode().render_info?.reactiveSet(clone);
                    setFocusedNode(clone);
                //}
            }
            else {
                let clone = ptree_shallow(focusedNode());
                clone.render_info!.cursor_index-=1;
                focusedNode().render_info?.reactiveSet(clone);
                setFocusedNode(clone);
            }
        }
        else {
            setFocusedNode(nav_left(focusedNode()));
        }
    }
    else if (event.key === "ArrowRight") {
        if (insertMode()) {
            if (is_box(focusedNode()) 
            || (focusedNode().children.length!==0 && focusedNode().render_info?.cursor_index===1) 
            || focusedNode().render_info?.cursor_index === focusedNode().token?.length) {
                let next = nav_right(focusedNode());
                setFocusedNode(next)
                let clone = ptree_shallow(focusedNode());
                clone.render_info!.cursor_index = 0;
                focusedNode().render_info?.reactiveSet(clone);
                setFocusedNode(clone);
            }
            else {
                let clone = ptree_shallow(focusedNode());
                clone.render_info!.cursor_index+=1;
                focusedNode().render_info?.reactiveSet(clone);
                setFocusedNode(clone);
            }
        }
        else {
            setFocusedNode(nav_right(focusedNode()));
        }
    }
    if (focusedNode()) {
        console.log(ptree_str(focusedNode()));
    }
    else {
        console.log("No selected node");
    }

      if (event.key === "Escape") {
        setInsertMode(false);
      }
  
      if (event.key === "Enter") {
        setInsertMode(true);
      }
  
        let target = getTarget(event,focusedNode());
        if (target === null){return;}
        else {
            // console.log(ptree_str(target));} else {console.log("no target");}
            if (target === true || target === false) {
                let root = get_root(focusedNode());
                if (root) {
                    set_node(root,ptree_shallow(root));
                    root.render_info?.ast?.accept(evaluator, undefined);
                    reset_focus(root);
                }
                return;
            }
            new_word = false;
            let newSubTrees = new_reparse(target);
            if (newSubTrees.length === 0) { 
                add_render_info(target);
                let target_clone = ptree_less_shallow(target);
                target.render_info?.reactiveSet(target_clone);
                return;
            }
            if (target.render_info === undefined) {
                return;
            }
            console.log(newSubTrees.length);
            let looking_at = newSubTrees[0][1];
            let new_node = newSubTrees[0][0];
            concreteify(new_node);
            set_node(looking_at,new_node);
            reset_focus(get_root(new_node))
            console.log("new tree");
            console.log(ptree_str(new_node));
            console.log("old");
            console.log(ptree_str(looking_at));
            new_node.render_info?.ast?.accept(evaluator, undefined);
        }
    }
  };

  createEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    if (!evaluator)
        evaluator = new EvaluatorVisitor(canvas);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  });

  return (
    <div>
        <Tree node={defaultParseTree} focusedNode={focusedNode} onFocus={handleFocus} index={0} length={0} style=""/>
        <canvas ref={canvas} width={256} height={256}></canvas>
    </div>
  );
};

function set_node(target: ParseTree, new_node: ParseTree) {
    new_node.render_info = target.render_info;
    add_render_info(new_node);
    target.render_info!.reactiveSet(new_node);
    if (!target.render_info!.parent) {
        return;
    }
    const index = target.render_info!.parent.children.indexOf(target);
    target.render_info!.parent.children[index] = new_node;
}
