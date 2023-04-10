import { createSignal, createEffect, For, JSX, Component } from "solid-js";
import { createStore } from "solid-js/store";
import { grammar_start, is_list, is_term } from "~/gen/grammar";
import { RenderInfo, ParseTree, ptree_str, ptree_shallow, ptree_less_shallow } from "~/parse";
import "./Tree.css";



type TreeProps = {
    node: ParseTree;
    parent?: ParseTree;
    focusedNode: () => ParseTree | null;
    onFocus: (node: ParseTree) => void;
    index: number;
    length: number;
  };

export const Tree: Component<TreeProps> = (props) => {



  if (!props.node.render_info) {
    console.log("err");
    console.log(ptree_str(props.node));
    return <>ERROR</>;
  }

  console.log("rendering node");
  console.log(ptree_str(props.node));

  const [tree, setTree] = createSignal<ParseTree>(props.node);
  const [children, setChildren] = createSignal<ParseTree[]>(tree().children);
  props.node.render_info.reactiveSet = setTree;

  createEffect(() => {
    if (is_list(tree().data) && tree().children.length == 2) {
      let children_inner = [tree().children[1]];
      let last_looking_at = tree();
      let looking_at = tree().children[0];
      let index = 0;
      while (is_list(looking_at.data)) {
        if (looking_at.render_info) {
          looking_at.render_info.reactiveSet = (x: ParseTree) => {
            let tree_copy = ptree_shallow(tree());
            console.log("reactive set inner");
            console.log(ptree_str(tree()));
            setTree(tree_copy);
          }
        }
        if (looking_at.children.length === 1) {
          children_inner.splice(0,0,looking_at.children[0]);
          break;
        }
        else if (looking_at.children.length === 2) {
          children_inner.splice(0,0,looking_at.children[1]);
          last_looking_at = looking_at;
          index += 1;
          looking_at = looking_at.children[0];
        }
        else {
          break; //this shouldn't happen??? hopefully :)
        }
      }
      setChildren(children_inner);
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
            {(child, i) => (
              <Tree node={child} focusedNode={props.focusedNode} onFocus={props.onFocus} parent={tree()} index={i()} length={children().length}/>
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