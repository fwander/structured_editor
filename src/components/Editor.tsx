
import { createSignal, createEffect, JSX, Component } from "solid-js";
import { grammar_start, is_list, is_term, Symbol } from "~/gen/grammar";
import { add_render_info, concreteify, defaultParseTree, get_root, ParseTree, ptree_less_shallow, ptree_shallow, ptree_str, reparse, retokenize, tokenize } from "~/parse";
import { Tree } from "./Tree";
import { child, next_sibling, parent, prev_sibling } from "~/navigate";

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
function getStreamAndTarget(event: KeyboardEvent, cursor: ParseTree): [stream: ParseTree[], target: ParseTree] | [null, null] {
    let adding_char = "";
    let insert_mode = true;
    if (!cursor || !cursor.render_info) {
        return [null, null];
    }
    if (event.key.length === 1 && isAlphaNumeric(event.key)) {
        adding_char = event.key;
    }
    if (!adding_char) {
        if (event.key != "Backspace") {
            return [null, null];
        }
    }
    let stream: ParseTree[] = [];
    let target: ParseTree;
    if (cursor.children.length === 0 && !cursor.token) { 
        // cursor is an imagined non term if these are true
        if (adding_char.length !== 0) {
            stream = tokenize(event.key);
        }
        else {
            stream = [];
        }
        target = cursor;
        return [stream, target]
    }
    else {
        const parent = cursor.render_info.parent;
        if (!parent) {
            return [null,null];
        }
        target = parent;
        let index = parent.children.indexOf(cursor);
        if (adding_char.length !== 0) {
            //target_clone.children.splice(index+1,0,{data: Symbol.unknown, children: [], token: event.key, start: 0, end: 0, num_imagined: 0});
            // stream = retokenize(target,event.key,index);
            if (is_term(cursor.data) && cursor.token) {
                const cursor_index = cursor.render_info.cursor_index;
                const token = cursor.token;
                let result = tokenize(token.slice(0,cursor_index) + adding_char + token.slice(cursor_index))
                console.log("result");
                for (const tree of result) {
                    console.log(ptree_str(tree));
                }
                target.children.splice(index,1);
                target.children.splice(index,0,...result);
                stream = target.children;
            }
            else {
                target.children.splice(index+1,0,...tokenize(adding_char));
                stream = target.children;
            }
        }
        else {
            let prev = target;
            while(target.children.length === 1 && target.render_info!.parent) {
                prev = target;
                target = target.render_info!.parent;
            }
            index = target.children.indexOf(prev);
            target.children.splice(index,1);
            stream = retokenize(target,"",Math.min(index-1,0));  //TODO maybe we don't need this math.min
            for (let i = 0; i < stream.length; i++) {
                stream[i].start = i;
                stream[i].end = i+1;
            }
        }
    }
    return [stream, target];
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
        let [stream,target] = getStreamAndTarget(event,focusedNode());
        if (!stream || !target) {
            return;
        }
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
        set_node(looking_at,newSubTrees[0]);
        console.log("new tree");
        console.log(ptree_str(get_root(newSubTrees[0])));
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
