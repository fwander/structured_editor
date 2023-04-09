
import { createSignal, createEffect, JSX, Component } from "solid-js";
import { grammar_start, is_list, is_term, Symbol } from "~/gen/grammar";
import { concreteify, defaultParseTree, ParseTree, ptree_less_shallow, ptree_shallow, ptree_str, reparse, retokenize, tokenize } from "~/parse";
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
    if (!cursor.render_info) {
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
        console.log("new stream");
        for (const tree of stream) {
            console.log(ptree_str(tree));
        }
        console.log("target");
        console.log(ptree_str(target));
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
                let result = tokenize(cursor.token.concat(adding_char))
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
    console.log("cursor");
    console.log(ptree_str(cursor));
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
        if (newSubTrees.length === 0) { 
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
            if (looking_at.render_info!.parent)
                looking_at = looking_at.render_info!.parent;
            up -= 1;
        }
        newSubTrees[0].render_info = looking_at.render_info;
        setFocusedNode(newSubTrees[0]);
        if (!looking_at.render_info!.parent) {
            setTree(newSubTrees[0]);
            if (looking_at.render_info) {
                looking_at.render_info.reactiveSet(newSubTrees[0]);
            }
            console.log("new tree:")
            console.log(ptree_str(newSubTrees[0]));
            return;
        }
        const index = looking_at.render_info!.parent.children.indexOf(looking_at);
        looking_at.render_info!.parent.children[index] = newSubTrees[0];
        newSubTrees[0].render_info = looking_at.render_info;
        console.log("new tree:")
        console.log(ptree_str(tree()));
        const orig_looking_at = looking_at;
        if (!is_term(looking_at.data) && is_list(looking_at.data)) {
            while(looking_at.render_info!.parent && !is_term(looking_at.data) && is_list(looking_at.data)) {
                if (!is_term(looking_at.render_info!.parent.data) && is_list(looking_at.data))
                    looking_at = looking_at.render_info!.parent;
                else
                    break;
            }
            if (looking_at.render_info) {
                if (looking_at === orig_looking_at) {
                    looking_at.render_info.reactiveSet(newSubTrees[0]);
                }
                else {
                    const new_looking = ptree_shallow(looking_at)
                    looking_at.render_info.reactiveSet(new_looking);
                    setFocusedNode(new_looking);
                }
            }
        }
        else {
            looking_at.render_info!.reactiveSet(newSubTrees[0]);
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
