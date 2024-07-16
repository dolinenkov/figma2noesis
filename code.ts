const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 960;

const COMMENT_TAG_TYPE = "!--";

interface Tag {
  type: string;
  attributes: Map<string, string>;
  children: Tag[];
}

// Turns a tree of tags into a formatted xaml document.
function to_xaml(root_node: Tag): string {

  const INDENTATION_SYMBOL = " ".repeat(2);
  
  var indentation_level = 0;
  var document : string = "";

  const write_node = (node: Tag): void => {

    const add_line = (line: string): void => {
      document += `${INDENTATION_SYMBOL.repeat(indentation_level)}${line}\n`;
    };

    const attributes = Array.from(node.attributes.entries()).map(([name, value], _0, _1) => {
      return ` ${name}="${value}"`;
    }).join("");

    if (node.type.startsWith(COMMENT_TAG_TYPE)) {
      // Comments have special logic
      console.assert(node.children.length === 0);
      add_line(`<${node.type}${attributes} -->`);
    } else if (node.children.length == 0) {
      // Tag without children is written in form of "<Tag (attributes) />"
      add_line(`<${node.type}${attributes} />`);
    } else {
      add_line(`<${node.type}${attributes}>`);
      indentation_level++;
      for (const child of node.children) {
        write_node(child);
      }
      indentation_level--;
      add_line(`</${node.type}>`);
    }
  };

  write_node(root_node);
  return document;
}

function to_hex_color(r: number, g: number, b: number, a?: number): string {
  const to_hex2 = (v: number): string => {
    const hex = Math.round(v * 255).toString(16);
    return hex.length < 2 ? `0${hex}` : hex;
  };
  return a
    ? `#${to_hex2(a)}${to_hex2(r)}${to_hex2(g)}${to_hex2(b)}`
    : `#${to_hex2(r)}${to_hex2(g)}${to_hex2(b)}`;
}

function process_figma_tree(root_nodes: readonly SceneNode[]): Tag {

  const create_tag = (parent: Tag | null, type: string, attributes: [string, string][], children: Tag[]): Tag => {
    let tag : Tag = {
      "type": type,
      "attributes": new Map<string, string>(attributes),
      "children": children,
    };
    if (parent) {
      parent.children.push(tag);
    }
    return tag;
  };

  const design_width = DESIGN_WIDTH.toFixed(0);
  const design_height = DESIGN_HEIGHT.toFixed(0);

  const create_root_user_control = (): Tag => create_tag(
    null,
    "UserControl",
    [
      [`xmlns`, `http://schemas.microsoft.com/winfx/2006/xaml/presentation`],
      [`xmlns:x`, `http://schemas.microsoft.com/winfx/2006/xaml`],
      [`xmlns:d`, `http://schemas.microsoft.com/expression/blend/2008`],
      [`xmlns:mc`, `http://schemas.openxmlformats.org/markup-compatibility/2006`],
      [`mc:Ignorable`, `d`],
      [`d:DesignWidth`, design_width],
      [`d:DesignHeight`, design_height],
      [`x:Name`, "RootControl"],
      [`Width`, design_width],
      [`Height`, design_height],
    ],
    [],
  );

  const create_doc_comment = (parent: Tag, node: SceneNode): Tag => create_tag(
    parent,
    COMMENT_TAG_TYPE,
    [
      [`x:Name`, `${node.name}`],
      [`Canvas.Left`, `${node.absoluteBoundingBox?.x.toFixed(3)}`],
      [`Canvas.Top`, `${node.absoluteBoundingBox?.y.toFixed(3)}`],
      [`Width`, `${node.absoluteBoundingBox?.width.toFixed(3)}`],
      [`Height`, `${node.absoluteBoundingBox?.height.toFixed(3)}`],
    ],
    [],
  );

  const node_attributes_with_opacity = (attributes: [string, string][], node: SceneNode): [string, string][] => {
    if ("opacity" in node) {
      attributes.push(["Opacity", `${node.opacity.toFixed(3)}`]);
    }
    return attributes;
  };

  const create_text_node = (parent: Tag, node: TextNode): Tag => {
    console.assert(node.fontName != figma.mixed);
    const font_family = (node.fontName != figma.mixed) ? node.fontName.family : "Montserrat";
    console.assert(node.fontSize != figma.mixed);
    const font_size = (node.fontSize != figma.mixed) ? node.fontSize : 20;
    return create_tag(
      parent,
      "TextBlock",
      [
        ["Text", node.characters],
        ["TextWrapping", "Wrap"],
        ["TextAlignment", "Left"],
        ["FontFamily", font_family],
        ["FontSize", `${font_size}`],
      ],
      [],
    );
  };

  const create_placement_canvas = (node: SceneNode): Tag => create_tag(
    null,
    "Canvas",
    node_attributes_with_opacity([
      ["x:Name", node.name],
      ["Width", `${node.absoluteBoundingBox?.width}`],
      ["Height", `${node.absoluteBoundingBox?.height}`],
      ["Canvas.Left", `${node.absoluteBoundingBox?.x}`],
      ["Canvas.Top", `${node.absoluteBoundingBox?.y}`],
    ], node),
    [],
  );

  const rgb_to_hex = (rgb: RGB, opacity?: number): string => to_hex_color(rgb.r, rgb.g, rgb.b, opacity);

  const rgba_to_hex = (rgba: RGBA, opacity?: number): string => to_hex_color(rgba.r, rgba.g, rgba.b, opacity ? opacity : rgba.a);

  // Adds Opacity to brush attributes.
  const brush_attributes_with_opacity = (attributes: [string, string][], opacity?: number): [string, string][] => {
    if (opacity) {
      attributes.push(["Opacity", opacity.toFixed(3)]);
    }
    return attributes;
  }

  const create_solid_color_brush = (brush: SolidPaint): Tag => create_tag(
    null,
    "SolidColorBrush",
    brush_attributes_with_opacity([
      ["Color", rgb_to_hex(brush.color)],
    ]),
    [],
  );
  
  const create_gradient_stop = (stop : ColorStop): Tag => {
    return create_tag(
      null,
      "GradientStop",
      [
        ["Color", rgba_to_hex(stop.color)],
        ["Offset", stop.position.toFixed(3)],
      ],
      [],
    );
  };

  const create_linear_gradient_brush = (paint: GradientPaint): Tag => {
    paint.gradientStops[0].position;
    paint.gradientStops[paint.gradientStops.length - 1].position;
    return create_tag(
      null,
      "LinearGradientBrush",
      brush_attributes_with_opacity([
        // TODO: StartPoint, EndPoint
      ]),
      paint.gradientStops.map((stop, _, __) => create_gradient_stop(stop)),
    )
  };

  const create_radial_gradient_brush = (paint: GradientPaint): Tag => {
    return create_tag(
      null,
      "RadialGradientBrush",
      brush_attributes_with_opacity([
        // TODO: RadiusX RadiusY GradientOrigin
      ]),
      paint.gradientStops.map((stop, _, __) => create_gradient_stop(stop)),
    )
  };

  const create_image_brush = (paint: ImagePaint): Tag => {
    var attributes: [string, string][] = [
      // TODO: ImageSource Stretch Viewbox
    ];
    if (paint.imageHash) {
      attributes.push(["ImageSource", `${paint.imageHash}.png`]);
    }
    return create_tag(null, "ImageBrush", attributes, []);
  };

  const generate_fills = (parent: Tag, node: SceneNode): Tag[] => {
    if ("fills" in node) {
      const fills_contents = (node.fills as Paint[]).map(
        (fill, _, __) => {
          if (fill.visible) {
            switch (fill.type) {
              case "SOLID":
                return create_solid_color_brush(fill as SolidPaint);
              case "GRADIENT_LINEAR":
                return create_linear_gradient_brush(fill as GradientPaint);
              case "GRADIENT_RADIAL":
                return create_radial_gradient_brush(fill as GradientPaint);
              case "IMAGE":
                return create_image_brush(fill as ImagePaint);
              default:
                break;
            }
          }
          return undefined;
        }
      ).filter((tag, _, __) => tag !== undefined);
      if (fills_contents.length > 0) {
        return [
          create_tag(parent, `${parent.type}.Background`, [], fills_contents),
        ];
      }
    }
    return [];
  };

  const generate_ui_tags_for_node = (parent: Tag, node: SceneNode): Tag[] => {
    const tags: Tag[] = [
      create_doc_comment(parent, node),
    ];
    if (node.type == "TEXT") {
      tags.push(create_text_node(parent, node));
    }
    return tags
      .concat(generate_fills(parent, node));
  };


  const first_of = (array: Array<any>): any => {
    console.assert(array.length > 0);
    return array[0];
  }

  const last_of = (array: Array<any>): any => {
    console.assert(array.length > 0);
    return array[array.length - 1];
  }

  let root_control: Tag = create_root_user_control();

  const process = (parent: Tag, nodes: readonly SceneNode[]): void => {
    // console.assert(parent.children.length == 0);
    for (const child_node of nodes) {
      // Create a canvas for generated nodes.
      var tech_tag_node = create_placement_canvas(child_node);
      // Fill the canvas with contents.
      generate_ui_tags_for_node(tech_tag_node, child_node);
      // Process grandchildren after direct children.
      if ("children" in child_node) {
        process(tech_tag_node, child_node.children);
      }
      // Don't save empty canvas.
      if (tech_tag_node.children.length > 0) {
        parent.children.push(tech_tag_node);
      }
    }
  };

  process(root_control, root_nodes);

  const resolve_name_conflicts = (): void => {
    // NoesisGUI doesn't like duplicate names, so we're traversing the tree again and renaming them.
    var name_duplicates_registry = new Map<String, number>();

    const rename_duplicates = (tag: Tag): void => {
      const name = tag.attributes.get("x:Name");
      if (name !== undefined) {
        const duplicates_counter = name_duplicates_registry.get(name);
        if (duplicates_counter !== undefined) {
          name_duplicates_registry.set(name, duplicates_counter + 1);
          tag.attributes.set("x:Name", `${name}_${duplicates_counter}`);
        } else {
          name_duplicates_registry.set(name, 0);
        }
      }
      for (const child of tag.children) {
        rename_duplicates(child);
      }
    }

    rename_duplicates(root_control);
  };

  resolve_name_conflicts();

  return root_control;
}

const tag_tree = process_figma_tree(figma.currentPage.selection);

const document = to_xaml(tag_tree);

console.log("Generated XAML");
console.log(document);

figma.closePlugin();
