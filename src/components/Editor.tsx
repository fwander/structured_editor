
import { createSignal, createEffect, JSX, Component } from "solid-js";
import { grammar_start, is_list, is_term, Symbol } from "~/gen/grammar";
import { add_render_info, concreteify, decompose, defaultParseTree, get_root, ParseTree, ptree_less_shallow, ptree_shallow, ptree_str, reparse, retokenize, tokenize } from "~/parse";
import { Tree } from "./Tree";
import { child, is_box, lca_prevcousin, next_sibling, parent, prev_cousin, prev_sibling } from "~/navigate";

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

// null if can't make edit
function getTarget(event: KeyboardEvent, cursor: ParseTree): ParseTree | null {
    let adding_char = "";
    let insert_mode = true;
    if (!cursor || !cursor.render_info) {
        return null;
    }
    if (event.key.length === 1 && isAlphaNumeric(event.key)) {
        adding_char = event.key;
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
            stream = tokenize(event.key);
            target = cursor;
            target.children  = stream;
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
            let result = tokenize(token.slice(0,cursor_index) + adding_char + token.slice(cursor_index))
            target.children.splice(index,1,...result);
            stream = target.children;
        }
        else {
            let delta = 1;
            if (target.render_info?.cursor_index === 0) {
                delta = 0;
            }
            target.children.splice(index+delta,0,...tokenize(adding_char));
            stream = target.children;
        }
    } 
    else { //deletion
        const parent = cursor.render_info.parent;
        if (!parent) {
            return null;
        }
        target = parent;
        target = del(cursor, target);
    }
    return target;
}

function obliterate(target: ParseTree) {
    let prev = target;
    do {
        prev = target;
        target = target.render_info!.parent!;
    } while(target.children.length === 1 && target.render_info!.parent);
    let index = target.children.indexOf(prev);
    target.children.splice(index,1);
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
                return obliterate(parent);
            }
            let result = tokenize(token.slice(0,cursor_index-1) + token.slice(cursor_index))
            parent.children.splice(index,1,...result);
            return parent;
        }
        else {
            const res = lca_prevcousin(cursor);
            if (res === null) {
                return cursor;
            }
            const [[lca, cursor_depth],[prev,prev_depth]] = res;
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
                else {
                    const nav_prev = prev_cousin(cursor);
                    if (nav_prev === cursor) {
                        return cursor;
                    }
                    return obliterate(prev_cousin(cursor));
                }
            }
        }
    }
    else if (cursor.children.length !== 0) {
        if (cursor.render_info.cursor_index === 1) {
            return obliterate(cursor);
        }
        else {
            const nav_prev = prev_cousin(cursor);
            if (nav_prev === cursor) {
                return cursor;
            }
            return obliterate(prev_cousin(cursor));
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
            const nav_prev = prev_cousin(cursor);
            if (nav_prev === cursor) {
                return cursor;
            }
            return obliterate(prev_cousin(cursor));
        }
    }
    return cursor;
}

export const [insertMode, setInsertMode] = createSignal<boolean>(false);
export const Editor: Component = () => {
//   const [tree, setTree] = createSignal<ParseTree>(defaultParseTree);
  const [focusedNode, setFocusedNode] = createSignal<ParseTree>(defaultParseTree);

  const handleFocus = (node: ParseTree) => {
    setFocusedNode(node);
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (focusedNode()) {
    if (event.key === "ArrowUp") {
        setFocusedNode(parent(focusedNode()));
      }
    else if (event.key === "ArrowDown") {
        setFocusedNode(child(focusedNode()));
    }
    else if (event.key === "ArrowLeft") {
        if (insertMode()) {
            let clone = ptree_shallow(focusedNode());
            clone.render_info!.cursor_index-=1;
            focusedNode().render_info?.reactiveSet(clone);
            setFocusedNode(clone);
        }
        else {
            setFocusedNode(prev_sibling(focusedNode()));
        }
    }
    else if (event.key === "ArrowRight") {
        if (insertMode()) {
            let clone = ptree_shallow(focusedNode());
            clone.render_info!.cursor_index+=1;
            focusedNode().render_info?.reactiveSet(clone);
            setFocusedNode(clone);
        }
        else {
            setFocusedNode(next_sibling(focusedNode()));
        }
    }
    if (focusedNode()) {
        console.log(ptree_str(focusedNode()));
    }
    else {
        console.log("No selected node");
    }

}
      if (event.key === "Escape") {
        setInsertMode(false);
      }
  
      if (event.key === "Enter") {
        setInsertMode(true);
      }
  
      if (insertMode()) {
        let [leafI, heI, rt] = getCoords(focusedNode());
        let target = getTarget(event,focusedNode());
        if (!target) {
            return;
        }
        let stream = target.children;
        let [newSubTrees, up] = reparse(target,stream);
        if (newSubTrees.length === 0) { 
            add_render_info(target);
            let target_clone = ptree_less_shallow(target);
            target.render_info?.reactiveSet(target_clone);
            return;
        }
        if (target.render_info === undefined) {
            return;
        }
        concreteify(newSubTrees[0]);
        let looking_at = target;
        while(up > 0) {
            if (!looking_at.render_info?.parent) {
                break;
            }
            looking_at = looking_at.render_info?.parent;
            up -= 1;
        }
        console.log("looking at");
        console.log(ptree_str(looking_at));
        console.log("setting to");
        console.log(ptree_str(newSubTrees[0]));
        set_node(looking_at,newSubTrees[0]);
        console.log("new tree");
        console.log(ptree_str(get_root(newSubTrees[0])));
        setFocusedNode(getTreeWithCoords(rt, leafI, heI)!);

    }
  };

  createEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  });

  return <Tree node={defaultParseTree} focusedNode={focusedNode} onFocus={handleFocus} index={0} length={0}/>;
};

function set_node(target: ParseTree, new_node: ParseTree) {
    new_node.render_info = target.render_info;
    add_render_info(new_node);
    if (!target.render_info!.parent) {
        if (target.render_info) {
            target.render_info.reactiveSet(new_node);
        }
        return;
    }
    const index = target.render_info!.parent.children.indexOf(target);
    target.render_info!.parent.children[index] = new_node;
    target.render_info!.reactiveSet(new_node);
}
