// PlantUML Mindmap Diagram PEG Grammar

Diagram
  = _ startmindmap? _ nodes:NodeList _ endmindmap? _ {
      return { type: "mindmap", root: nodes[0] ?? null };
    }

startmindmap = "@startmindmap" (!EOL .)* EOL
endmindmap   = "@endmindmap" (!EOL .)*

NodeList
  = nodes:(NodeLine _)* {
      // Build tree from flat indentation-based list
      const flat = nodes.map(n => n[0]).filter(n => n !== null);
      if (flat.length === 0) return [];

      const root = flat[0];
      const stack = [root];

      for (let i = 1; i < flat.length; i++) {
        const node = flat[i];

        // Pop stack until we find parent (level < current)
        while (stack.length > 1 && stack[stack.length - 1].level >= node.level) {
          stack.pop();
        }

        const parent = stack[stack.length - 1];
        parent.children.push(node);
        stack.push(node);
      }

      return [root];
    }

NodeLine
  = Comment { return null; }
  / SkinParam { return null; }
  / HideDirective { return null; }
  / StyleLine { return null; }
  / LeftNode
  / RightNode

// Right-side nodes use *
RightNode
  = stars:$("*"+ ) ":"? _ label:NodeLabel {
      return {
        level: stars.length,
        label: label.trim(),
        side: "right",
        shape: "default",
        children: []
      };
    }

// Left-side nodes use -  (PlantUML mindmap left branch)
LeftNode
  = dashes:$("-"+ ) ":"? _ label:NodeLabel {
      return {
        level: dashes.length,
        label: label.trim(),
        side: "left",
        shape: "default",
        children: []
      };
    }

NodeLabel
  = "[" text:$([^\]\n\r]*) "]" { return text; }
  / "_" text:$([^_\n\r]*) "_" { return text; }
  / text:$([^\n\r]+) { return text; }

// --- Comments ---
Comment
  = "'" (!EOL .)* EOL?
  / "/'" (!("'/") .)* "'/"

// --- Directives we ignore ---
SkinParam
  = "skinparam" __ (!("{" / EOL) .)* _ "{" (!"}" .)* "}"
  / "skinparam" __ (!EOL .)* EOL?

HideDirective
  = "hide" __ (!EOL .)* EOL?

StyleLine
  = "header" (!EOL .)* EOL?
  / "caption" (!EOL .)* EOL?
  / "title" (!EOL .)* EOL?
  / "left side" (!EOL .)* EOL?
  / "right side" (!EOL .)* EOL?

// --- Whitespace ---
_  = [ \t\n\r]*
__ = [ \t]+
EOL = "\r\n" / "\n" / "\r"
