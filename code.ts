
var document : string = "";
var indentation = 0;
const indentation_value = 2;

function append_document(line: String)
{
  document += `${" ".repeat(indentation)}${line}\n`;
}

function stringify_attributes(attribute_list : readonly String[])
{
  var prefix = attribute_list.length > 0 ? " " : "";
  return `${prefix}${attribute_list.join(" ")}${prefix}`;
}

function process_nodes(nodes: readonly SceneNode[])
{
  for (const node of nodes)
  {
    // RECTANGLE
    // ELLIPSE
    // TEXT
    // GROUP
    // VECTOR

    if (!node.visible)
    {
      continue;
    }
    
    var tag : string = "b";
    var attributes = [];

    attributes.push(`x:Name="${node.name}"`);

    switch (node.type)
    {
      case "FRAME":
        // console.log("FRAME");
        break;

      case "GROUP":
        break;

      case "RECTANGLE":
        // node.fillGeometry.
        break;

      case "ELLIPSE":
        break;

      case "TEXT":
        break;

      case "GROUP":
        break;

      case "VECTOR":
        break;

      default:
        console.error("Unknown node type: ", node.type);
        break;
    }

    var prefix = " ".repeat(indentation);

    if (!("children" in node) || node.children.length == 0)
    {
      append_document(`<${tag}${stringify_attributes(attributes)}/>`);
    }
    else
    {
      append_document(`<${tag}${stringify_attributes(attributes)}>`);
      indentation += indentation_value;
      process_nodes(node.children);
      indentation -= indentation_value;
      append_document(`</${tag}>`);
    }
  }
}

process_nodes(figma.currentPage.selection);
console.log(`generated:\n ${document}`);

figma.closePlugin();
