
import { createSignal, createEffect, JSX, Component } from "solid-js";
import { grammar_start, is_list, is_term, Symbol } from "~/gen/grammar";
import { concreteify, correct_parents, defaultParseTree, ParseTree, ptree_less_shallow, ptree_shallow, ptree_str, reparse, retokenize, tokenize } from "~/parse";
import { Tree } from "./Tree";

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
        const parent = cursor.parent;
        if (!parent) {
            return [null,null];
        }
        target = parent;
        const index = parent.children.indexOf(cursor);
        if (adding_char.length !== 0) {
            const target_clone = ptree_less_shallow(target);
            let delta = insert_mode? 1 : 0;
            if (is_list[target.data - grammar_start]) {
                delta = 0;
            }
            target_clone.children.splice(index+delta,0,{data: Symbol.unknown, children: [], token: event.key, start: 0, end: 0, num_imagined: 0});
            stream = retokenize(target_clone,index+1);
        }
        else {
            while(target.children.length === 1 && target.parent) {
                target = target.parent;
            }
            const target_clone = ptree_less_shallow(target);
            target_clone.children.splice(index,1);
            stream = target_clone.children;
            for (let i = 0; i < stream.length; i++) {
                stream[i].start = i;
                stream[i].end = i+1;
            }
        }
    }
    console.log("new stream");
    for (const tree of stream) {
        console.log(ptree_str(tree));
    }
    console.log("target");
    console.log(ptree_str(target));
    return [stream, target];
}

export const Editor: Component = () => {
  const [tree, setTree] = createSignal<ParseTree>(defaultParseTree);
  const [focusedNode, setFocusedNode] = createSignal<ParseTree>(tree());
  const [insertMode, setInsertMode] = createSignal<boolean>(false);

  const handleFocus = (node: ParseTree) => {
    setFocusedNode(node);
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        // TODO
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
        if (newSubTrees.length === 0) { return;}
        console.log("pre tree")
        console.log(ptree_str(newSubTrees[0]));
        concreteify(newSubTrees[0]);
        correct_parents(newSubTrees[0]);
        let looking_at = target;
        while(up > 0) {
            if (looking_at.parent)
                looking_at = looking_at.parent;
            up -= 1;
        }
        newSubTrees[0].reactiveSet = looking_at.reactiveSet;
        setFocusedNode(newSubTrees[0]);
        if (!looking_at.parent) {
            setTree(newSubTrees[0]);
            if (looking_at.reactiveSet) {
                looking_at.reactiveSet(newSubTrees[0]);
            }
            console.log("new tree:")
            console.log(ptree_str(newSubTrees[0]));
            return;
        }
        const index = looking_at.parent.children.indexOf(looking_at);
        looking_at.parent.children[index] = newSubTrees[0];
        newSubTrees[0].parent = looking_at.parent;
        console.log("new tree:")
        console.log(ptree_str(tree()));
        const orig_looking_at = looking_at;
        if (!is_term(looking_at.data) && is_list[looking_at.data - grammar_start]) {
            while(looking_at.parent && !is_term(looking_at.data) && is_list[looking_at.data - grammar_start]) {
                if (!is_term(looking_at.parent.data) && is_list[looking_at.parent.data - grammar_start])
                    looking_at = looking_at.parent;
                else
                    break;
            }
            if (looking_at.reactiveSet) {
                if (looking_at === orig_looking_at) {
                    looking_at.reactiveSet(newSubTrees[0]);
                }
                else {
                    const new_looking = ptree_shallow(looking_at)
                    looking_at.reactiveSet(new_looking);
                    setFocusedNode(new_looking);
                }
            }
        }
        else {
            if (looking_at.reactiveSet) {
                looking_at.reactiveSet(newSubTrees[0]);
            }
        }
      }
  };

  createEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  });

  return <Tree node={tree()} focusedNode={focusedNode} onFocus={handleFocus} />;
};
