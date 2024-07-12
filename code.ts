const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 960;

class Tag {
  private type: string;
  private attributes: string[];
  private children: Tag[];
  private level: number;

  constructor(type: string, attributes: string[] = []) {
    this.type = type;
    this.attributes = attributes;
    this.children = [];
    this.level = 0;
  }

  add_attribute(attribute: string) : void {
    this.attributes.push(attribute);
  }

  add_child(child: Tag) : void {
    const set_level_recursive = (child: Tag, level: number) : void => {
      child.level = level;
      for (var grandchild of child.children) {
        set_level_recursive(grandchild, level + 1);
      }
    };
    set_level_recursive(child, this.level + 1);
    this.children.push(child);
  }

  get_type() : string {
    return this.type;
  }

  has_children() : boolean {
    return this.children.length > 0;
  }

  to_lines() : string[] {
    return this._to_lines(this.level);
  }

  private _to_lines(level: number) : string[] {
    const indent = "  ".repeat(level);
    const indented = (text: string) : string => {
      return `${indent}${text}`;
    };
    const attributes = this.attributes.length > 0 ? ` ${this.attributes.join(" ")} ` : ``;

    var lines : string[] = [];

    if (this.children.length > 0) {
      lines.push(indented(`<${this.type}${attributes}>`));
      this.children.forEach((child, _0, _1) => {
        lines = lines.concat(child.to_lines());
      });
      lines.push(indented(`</${this.type}>`));
    } else {
      lines.push(indented(`<${this.type}${attributes}/>`));
    }
    return lines;
  }
}

class ColorUtil {
  static to_web_rgba(rgba: RGBA) : string {
    return `#${this.to_hex(rgba.a)}${this.to_hex(rgba.r)}${this.to_hex(rgba.g)}${this.to_hex(rgba.b)}`;
  }
  static to_web_rgb(rgb: RGB) : string {
    return `#${this.to_hex(rgb.r)}${this.to_hex(rgb.g)}${this.to_hex(rgb.b)}`;
  }
  private static to_hex(v: number) : string {
    console.assert(v >= 0.0 && v <= 1.0);
    return Math.round(v * 255).toString(16);
  }
}

function user_control() : Tag {
  return new Tag("UserControl", [
    `xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"`,
    `xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"`,
    `xmlns:d="http://schemas.microsoft.com/expression/blend/2008"`,
    `xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"`,
    `mc:Ignorable="d"`,
    `d:DesignWidth="${DESIGN_WIDTH.toFixed(0)}"`,
    `d:DesignHeight="${DESIGN_HEIGHT.toFixed(0)}"`,
    `x:Name="Root"`,
    `Width="${DESIGN_WIDTH.toFixed(0)}"`,
    `Height="${DESIGN_HEIGHT.toFixed(0)}"`,
  ]);
}

function value_or(value : any | null, fallback : any) : any {
  return value ? value : fallback;
}

function generate_default_comment(node: SceneNode) : Tag {
  return new Tag("!--", [
    `${node.name}`,
    `Canvas.Left="${node.absoluteBoundingBox?.x.toFixed(3)}"`,
    `Canvas.Top="${node.absoluteBoundingBox?.y.toFixed(3)}"`,
    `Width="${node.absoluteBoundingBox?.width.toFixed(3)}"`,
    `Height="${node.absoluteBoundingBox?.height.toFixed(3)}"`,
  ]);
}

function generate_placement_canvas(node: SceneNode) : Tag {
  return new Tag("Canvas", [
    `x:Name="${node.name}"`
  ]);
}

// Возвращает последний элемент массива.
function last_of(arr: any[]) : any {
  console.assert(arr.length > 0);
  return arr[arr.length - 1];
}

// Функция, генерирующая xaml'овские ноды.
function generate_ui_elements_for_node(node: SceneNode) : Tag[] {
  var tags = [
    generate_default_comment(node),
    generate_placement_canvas(node),
  ];

  const make_solid_color_brush = (paint: SolidPaint) : Tag => {
    var brush_attributes = [
      `Color="${ColorUtil.to_web_rgb(paint.color)}"`,
    ];
    if (paint.opacity) {
      brush_attributes.push(`Opacity="${paint.opacity.toFixed(3)}"`);
    }
    return new Tag("SolidColorBrush", brush_attributes);
  };

  const make_gradient_stop = (stop : ColorStop) : Tag => {
    return new Tag("GradientStop", [
      `Color="${ColorUtil.to_web_rgba(stop.color)}"`,
      `Offset="${stop.position.toFixed(3)}"`,
    ]);
  };

  const make_linear_gradient_brush_attributes = (paint: GradientPaint) : Tag => {
    var brush_attributes : string[] = [
      // TODO: StartPoint, EndPoint
    ];
    var brush = new Tag("LinearGradientBrush", brush_attributes);
    for (const stop of paint.gradientStops) {
      brush.add_child(make_gradient_stop(stop));
    }
    return brush;
  }

  const make_radial_gradient_brush_attributes = (paint: GradientPaint) : Tag => {
    var brush_attributes : string[] = [
      // TODO: RadiusX="0.6" RadiusY="0.8" GradientOrigin="0.3,0.3"
    ];
    var brush = new Tag("RadialGradientBrush", brush_attributes);
    for (const stop of paint.gradientStops) {
      brush.add_child(make_gradient_stop(stop));
    }
    return brush;
  };

  if ("fills" in node) {
    const fills = node.fills as Paint[];
    if (fills) {
      for (const fill of fills) {
        if (!fill.visible) continue;
        const background_tag = new Tag(`${last_of(tags).get_type()}.Background`);
        switch (fill.type) {
          case "SOLID": {
            background_tag.add_child(make_solid_color_brush(fill as SolidPaint));
            break;
          }

          case "GRADIENT_LINEAR": {
            background_tag.add_child(make_linear_gradient_brush_attributes(fill as GradientPaint));
            break;
          }
            
          case "GRADIENT_RADIAL": {
            background_tag.add_child(make_radial_gradient_brush_attributes(fill as GradientPaint));
            break;
          }

          case "IMAGE": {
            const image_hash = (fill as ImagePaint).imageHash;
            if (image_hash) {
              background_tag.add_child(new Tag(""))
              const image = figma.getImageByHash(image_hash);
              if (image) {

                // console.error(image_hash);
                // const size = image.getSizeAsync();
              }
            }
            break;
          }

          default: {
            console.error(`Fill type ${fill.type} is not supported!`);
            break;
          }
        }

        tags.push(background_tag);
      }
    }
  }

  return tags;
}

function traverse_nodes(nodes: readonly SceneNode[], root: Tag) : void {
  for (const node of nodes) {
    // Генерируем все возможные элементы.
    const generated_elements = node.visible ? generate_ui_elements_for_node(node) : [];
    for (const element of generated_elements) {
      root.add_child(element);
    }
    // Обрабатываем всех потомков
    if ("children" in node) {
      console.assert(generated_elements.length > 0);
      traverse_nodes(node.children, last_of(generated_elements));
    }
  }
}

var root = user_control();
traverse_nodes(figma.currentPage.selection, root);
console.log(`generated:\n ${root.to_lines().join("\n")}`);
figma.closePlugin();
