import { createSignal, createEffect, For, JSX, Component } from "solid-js";
import { grammar_start, is_list, is_term } from "~/gen/grammar";
import { ParseTree, ptree_str } from "~/parse";
import "./Tree.css";



type TreeProps = {
    node: ParseTree;
    focusedNode: () => ParseTree | null;
    onFocus: (node: ParseTree) => void;
  };

export const Tree: Component<TreeProps> = (props) => {

  const [tree, setTree] = createSignal<ParseTree>(props.node);
  const [children, setChildren] = createSignal<ParseTree[]>(tree().children);
  props.node.reactiveSet = setTree;

  createEffect(() => {
    if (!is_term(tree().data) && is_list[tree().data - grammar_start] && tree().children.length == 2) {
      let children = [tree().children[1]];
      let looking_at = tree().children[0];
      while (is_list[looking_at.data - grammar_start]) {
        if (looking_at.children.length === 1) {
          children.splice(0,0,looking_at.children[0]);
          break;
        }
        else if (looking_at.children.length === 2) {
          children.splice(0,0,looking_at.children[1]);
          looking_at = looking_at.children[0];
        }
        else {
          break; //this shouldn't happen??? hopefully :)
        }
      }
      setChildren(children);
    }
    else {
      setChildren(tree().children);
    }
  });

  const handleFocus = () => {
    props.onFocus(tree());
  };

  return (
    <>
      <div
        tabIndex="0"
        onFocus={handleFocus}
        class={tree() === props.focusedNode() ? "focused" : ""}
      >
        {(tree().token)?
        <div
          tabIndex="0"
          onFocus={handleFocus}
          class={tree() === props.focusedNode() ? "focused" : ""}
        >
          {tree().token}
        </div>
        : 
         (children().length !== 0)? <div>
          <For each={children()}>
            {(child) => (
              <Tree node={child} focusedNode={props.focusedNode} onFocus={props.onFocus} />
            )}
          </For>
        </div> 
        : 
        <div>
          empty
        </div>
        }
      </div>
    </>
  );
};