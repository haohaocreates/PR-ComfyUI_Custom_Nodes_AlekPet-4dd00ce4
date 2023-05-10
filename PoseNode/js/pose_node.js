/*
 * Title: Set Poses in ComflyUI from ControlNet
 * Author: AlekPet
 * Description: I rewrote the main.js file as a class, from fkunn1326's openpose-editor (https://github.com/fkunn1326/openpose-editor/blob/master/javascript/main.js)
 * Version: 2023.05.10
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet
 */

import { app } from "../scripts/app.js";
import { fabric } from "/lib/fabric.js";

fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerColor = "#108ce6";
fabric.Object.prototype.borderColor = "#108ce6";
fabric.Object.prototype.cornerSize = 10;

let connect_keypoints = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 5],
  [5, 6],
  [6, 7],
  [1, 8],
  [8, 9],
  [9, 10],
  [1, 11],
  [11, 12],
  [12, 13],
  [0, 14],
  [14, 16],
  [0, 15],
  [15, 17],
];

let connect_color = [
  [0, 0, 255],
  [255, 0, 0],
  [255, 170, 0],
  [255, 255, 0],
  [255, 85, 0],
  [170, 255, 0],
  [85, 255, 0],
  [0, 255, 0],
  [0, 255, 85],
  [0, 255, 170],
  [0, 255, 255],
  [0, 170, 255],
  [0, 85, 255],
  [85, 0, 255],
  [170, 0, 255],
  [255, 0, 255],
  [255, 0, 170],
  [255, 0, 85],
];

const default_keypoints = [
  [241, 77],
  [241, 120],
  [191, 118],
  [177, 183],
  [163, 252],
  [298, 118],
  [317, 182],
  [332, 245],
  [225, 241],
  [213, 359],
  [215, 454],
  [270, 240],
  [282, 360],
  [286, 456],
  [232, 59],
  [253, 60],
  [225, 70],
  [260, 72],
];

class OpenPose {
  constructor(node, canvasElement) {
    this.lockMode = false;
    this.visibleEyes = true;
    this.flipped = false;
    this.undo_history = [];
    this.redo_history = [];
    this.fileName = node.name;
    this.canvas = this.initCanvas(canvasElement);
    this.node = node;
    this.image = node.widgets.find((w) => w.name === "image");
  }

  setPose(keypoints) {
    this.canvas.clear();

    this.canvas.backgroundColor = "#000";

    const res = [];
    for (let i = 0; i < keypoints.length; i += 18) {
      const chunk = keypoints.slice(i, i + 18);
      res.push(chunk);
    }

    for (let item of res) {
      this.addPose(item);
      this.canvas.discardActiveObject();
    }
  }

  addPose(keypoints = undefined) {
    if (keypoints === undefined) {
      keypoints = default_keypoints;
    }

    const group = new fabric.Group();

    const makeCircle = (
      color,
      left,
      top,
      line1,
      line2,
      line3,
      line4,
      line5
    ) => {
      var c = new fabric.Circle({
        left: left,
        top: top,
        strokeWidth: 1,
        radius: 5,
        fill: color,
        stroke: color,
      });

      c.hasControls = c.hasBorders = false;
      c.line1 = line1;
      c.line2 = line2;
      c.line3 = line3;
      c.line4 = line4;
      c.line5 = line5;

      return c;
    };

    const makeLine = (coords, color) => {
      return new fabric.Line(coords, {
        fill: color,
        stroke: color,
        strokeWidth: 10,
        selectable: false,
        evented: false,
      });
    };

    const lines = [];
    const circles = [];

    for (let i = 0; i < connect_keypoints.length; i++) {
      // 接続されるidxを指定　[0, 1]なら0と1つなぐ
      const item = connect_keypoints[i];
      const line = makeLine(
        keypoints[item[0]].concat(keypoints[item[1]]),
        `rgba(${connect_color[i].join(", ")}, 0.7)`
      );
      lines.push(line);
      this.canvas.add(line);
    }

    for (let i = 0; i < keypoints.length; i++) {
      let list = [];

      connect_keypoints.filter((item, idx) => {
        if (item.includes(i)) {
          list.push(lines[idx]);
          return idx;
        }
      });
      const circle = makeCircle(
        `rgb(${connect_color[i].join(", ")})`,
        keypoints[i][0],
        keypoints[i][1],
        ...list
      );
      circle["id"] = i;
      circles.push(circle);
      group.addWithUpdate(circle);
    }

    this.canvas.discardActiveObject();
    this.canvas.setActiveObject(group);
    this.canvas.add(group);
    group.toActiveSelection();
    this.canvas.requestRenderAll();
  }

  initCanvas() {
    this.canvas = new fabric.Canvas(this.canvas, {
      backgroundColor: "#000",
      preserveObjectStacking: true,
    });

    const updateLines = (target) => {
      if ("_objects" in target) {
        const flipX = target.flipX ? -1 : 1;
        const flipY = target.flipY ? -1 : 1;
        this.flipped = flipX * flipY === -1;
        const showEyes = this.flipped ? !this.visibleEyes : this.visibleEyes;

        if (target.angle === 0) {
          const rtop = target.top;
          const rleft = target.left;
          for (const item of target._objects) {
            let p = item;
            p.scaleX = 1;
            p.scaleY = 1;
            const top =
              rtop +
              p.top * target.scaleY * flipY +
              (target.height * target.scaleY) / 2;
            const left =
              rleft +
              p.left * target.scaleX * flipX +
              (target.width * target.scaleX) / 2;
            p["_top"] = top;
            p["_left"] = left;
            if (p["id"] === 0) {
              p.line1 && p.line1.set({ x1: left, y1: top });
            } else {
              p.line1 && p.line1.set({ x2: left, y2: top });
            }
            if (p["id"] === 14 || p["id"] === 15) {
              p.radius = showEyes ? 5 : 0;
              if (p.line1) p.line1.strokeWidth = showEyes ? 10 : 0;
              if (p.line2) p.line2.strokeWidth = showEyes ? 10 : 0;
            }
            p.line2 && p.line2.set({ x1: left, y1: top });
            p.line3 && p.line3.set({ x1: left, y1: top });
            p.line4 && p.line4.set({ x1: left, y1: top });
            p.line5 && p.line5.set({ x1: left, y1: top });
          }
        } else {
          const aCoords = target.aCoords;
          const center = {
            x: (aCoords.tl.x + aCoords.br.x) / 2,
            y: (aCoords.tl.y + aCoords.br.y) / 2,
          };
          const rad = (target.angle * Math.PI) / 180;
          const sin = Math.sin(rad);
          const cos = Math.cos(rad);

          for (const item of target._objects) {
            let p = item;
            const p_top = p.top * target.scaleY * flipY;
            const p_left = p.left * target.scaleX * flipX;
            const left = center.x + p_left * cos - p_top * sin;
            const top = center.y + p_left * sin + p_top * cos;
            p["_top"] = top;
            p["_left"] = left;
            if (p["id"] === 0) {
              p.line1 && p.line1.set({ x1: left, y1: top });
            } else {
              p.line1 && p.line1.set({ x2: left, y2: top });
            }
            if (p["id"] === 14 || p["id"] === 15) {
              p.radius = showEyes ? 5 : 0.3;
              if (p.line1) p.line1.strokeWidth = showEyes ? 10 : 0;
              if (p.line2) p.line2.strokeWidth = showEyes ? 10 : 0;
            }
            p.line2 && p.line2.set({ x1: left, y1: top });
            p.line3 && p.line3.set({ x1: left, y1: top });
            p.line4 && p.line4.set({ x1: left, y1: top });
            p.line5 && p.line5.set({ x1: left, y1: top });
          }
        }
      } else {
        var p = target;
        if (p["id"] === 0) {
          p.line1 && p.line1.set({ x1: p.left, y1: p.top });
        } else {
          p.line1 && p.line1.set({ x2: p.left, y2: p.top });
        }
        p.line2 && p.line2.set({ x1: p.left, y1: p.top });
        p.line3 && p.line3.set({ x1: p.left, y1: p.top });
        p.line4 && p.line4.set({ x1: p.left, y1: p.top });
        p.line5 && p.line5.set({ x1: p.left, y1: p.top });
      }
      this.canvas.renderAll();
    };

    this.canvas.on("object:moving", (e) => {
      updateLines(e.target);
    });

    this.canvas.on("object:scaling", (e) => {
      updateLines(e.target);
      this.canvas.renderAll();
    });

    this.canvas.on("object:rotating", (e) => {
      updateLines(e.target);
      this.canvas.renderAll();
    });

    this.canvas.on("object:modified", () => {
      this.uploadPoseFile(`${this.fileName}.png`);
      if (this.lockMode) return;
      this.undo_history.push(this.getJSON());
      this.redo_history.length = 0;
    });

    this.setPose(default_keypoints);
    this.undo_history.push(this.getJSON());
    return this.canvas;
  }

  undo() {
    if (this.undo_history.length > 0) {
      this.lockMode = true;
      if (this.undo_history.length > 1)
        this.redo_history.push(this.undo_history.pop());

      const content = this.undo_history[this.undo_history.length - 1];
      this.loadPreset(content);
      this.canvas.renderAll();
      this.lockMode = false;
      this.uploadPoseFile(`${this.fileName}.png`);
    }
  }

  redo() {
    if (this.redo_history.length > 0) {
      this.lockMode = true;
      const content = this.redo_history.pop();
      this.undo_history.push(content);
      this.loadPreset(content);
      this.canvas.renderAll();
      this.lockMode = false;
      this.uploadPoseFile(`${this.fileName}.png`);
    }
  }

  resetCanvas = () => {
    this.canvas.clear();
    this.canvas.backgroundColor = "#000";
    this.addPose();
  };

  uploadPoseFile = (fileName) => {
    // Upload pose to temp folder ComfyUI
    const uploadFile = async (blobFile) => {
      try {
        const resp = await fetch("/upload/image", {
          method: "POST",
          body: blobFile,
        });

        if (resp.status === 200) {
          const data = await resp.json();

          if (!this.image.options.values.includes(data.name)) {
            this.image.options.values.push(data.name);
          }

          this.image.value = data.name;
          LS_Poses[this.node.name][data.name] = this.getJSON();
          LS_Save();
        } else {
          alert(resp.status + " - " + resp.statusText);
        }
      } catch (error) {
        alert(error);
      }
    };

    this.canvas.lowerCanvasEl.toBlob(function (blob) {
      let formData = new FormData();
      formData.append("image", blob, fileName);
      formData.append("type", "temp");
      uploadFile(formData);
    }, "image/png");
    // - end

    const callb = this.node.callback,
      self = this;
    this.image.callback = function () {
      let nameFile = self.node.name;
      if (
        Object.hasOwn(LS_Poses, nameFile) &&
        Object.hasOwn(LS_Poses[nameFile], self.image.value)
      ) {
        self.loadPreset(LS_Poses[nameFile][self.image.value]);
      } else {
        console.log(`Pose "${self.image.value}" not found in LocalStorage!`);
      }
      if (callb) {
        return callb.apply(this, arguments);
      }
    };
  };

  getJSON = () => {
    const json = {
      keypoints: this.canvas
        .getObjects()
        .filter((item) => {
          if (item.type === "circle") return item;
        })
        .map((item) => {
          return [Math.round(item.left), Math.round(item.top)];
        }),
    };

    return json;
  };

  loadPreset = (json) => {
    try {
      if (json["keypoints"].length % 18 === 0) {
        this.setPose(json["keypoints"]);
      } else {
        throw new Error("keypoints is invalid");
      }
    } catch (e) {
      console.error(e);
    }
  };
}

// Create OpenPose widget
function createOpenPose(node, inputName, inputData, app) {
  node.name = inputName;
  const widget = {
    type: "openpose",
    name: `w${inputName}`,

    draw: function (ctx, _, widgetWidth, y, widgetHeight) {
      const t = ctx.getTransform();
      const margin = 10;

      let w = (widgetWidth - margin * 2 - 3) * t.a;

      Object.assign(this.openpose.style, {
        left: `${t.a * margin + t.e}px`,
        top: `${t.d * (y + widgetHeight - margin - 3) + t.f}px`,
        width: w + "px",
        height: w + "px",
        position: "absolute",
        zIndex: app.graph._nodes.indexOf(node),
      });

      Object.assign(this.openpose.children[0].style, {
        width: w + "px",
        height: w + "px",
      });

      Object.assign(this.openpose.children[1].style, {
        width: w + "px",
        height: w + "px",
      });
    },
  };

  // Create canvas to ouput pose
  let canvasOpenPose = document.createElement("canvas"),
    panelButtons = document.createElement("div"),
    undoButton = document.createElement("button"),
    redoButton = document.createElement("button");

  panelButtons.className = "panelButtons";
  undoButton.textContent = "⟲";
  redoButton.textContent = "⟳";
  undoButton.title = "Undo";
  redoButton.title = "Redo";

  undoButton.addEventListener("click", () => node.openPose.undo());
  redoButton.addEventListener("click", () => node.openPose.redo());

  // Fabric canvas
  node.openPose = new OpenPose(node, canvasOpenPose);

  node.openPose.canvas.setWidth(512);
  node.openPose.canvas.setHeight(512);

  let widgetCombo = node.widgets.filter((w) => w.type === "combo");
  widgetCombo[0].value = `${node.name}.png`;

  widget.openpose = node.openPose.canvas.wrapperEl;
  widget.parent = node;

  panelButtons.appendChild(undoButton);
  panelButtons.appendChild(redoButton);
  node.openPose.canvas.wrapperEl.appendChild(panelButtons);

  document.body.appendChild(widget.openpose);

  // Add buttons add, reset, undo, redo poses
  node.addWidget("button", "Add pose", "add_pose", () => {
    node.openPose.addPose();
  });

  node.addWidget("button", "Reset pose", "reset_pose", () => {
    node.openPose.resetCanvas();
  });

  // node.addWidget("button", "Undo", "undo_pose", () => {
  //   node.openPose.undo();
  // });

  // node.addWidget("button", "Redo", "redo_pose", () => {
  //   node.openPose.redo();
  // });

  // Add customWidget to node
  node.addCustomWidget(widget);

  node.onRemoved = () => {
    if (Object.hasOwn(LS_Poses, node.name)) {
      delete LS_Poses[node.name];
      LS_Save();
    }

    // When removing this node we need to remove the input from the DOM
    for (let y in node.widgets) {
      if (node.widgets[y].openpose) {
        node.widgets[y].openpose.remove();
      }
    }
  };

  widget.onRemove = () => {
    widget.openpose?.remove();
  };

  app.canvas.onDrawBackground = function () {
    // Draw node isnt fired once the node is off the screen
    // if it goes off screen quickly, the input may not be removed
    // this shifts it off screen so it can be moved back if the node is visible.
    for (let n in app.graph._nodes) {
      n = graph._nodes[n];
      for (let w in n.widgets) {
        let wid = n.widgets[w];
        if (Object.hasOwn(wid, "openpose")) {
          wid.openpose.style.left = -8000 + "px";
          wid.openpose.style.position = "absolute";
        }
      }
    }
  };
  return { widget: widget };
}

window.LS_Poses = {};
function LS_Save() {
  localStorage.setItem("ComfyUI_Poses", JSON.stringify(LS_Poses));
}

app.registerExtension({
  name: "Comfy.PoseNode",
  async init(app) {
    // Any initial setup to run as soon as the page loads
    let style = document.createElement("style");
    style.innerText = `.panelButtons{
      position: absolute;
      padding: 4px;
      display: flex;
      gap: 4px;
      flex-direction: column;
    }
    .panelButtons button{
      background: #ffffff52;
      color: white;
    }
    
    `;
    document.head.appendChild(style);
  },
  async setup(app) {
    console.log("Setup PoseNode");
    let openPoseNode = app.graph._nodes.filter((wi) => wi.type == "PoseNode");

    if (openPoseNode.length) {
      openPoseNode.map((n) => {
        let widgetImage = n.widgets.find((w) => w.name == "image");
        if (
          widgetImage &&
          Object.hasOwn(LS_Poses, n.name) &&
          Object.hasOwn(LS_Poses[n.name], widgetImage.value)
        ) {
          n.openPose.loadPreset(LS_Poses[n.name][widgetImage.value]);
        }
      });
    }
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "PoseNode") {
      const onNodeCreated = nodeType.prototype.onNodeCreated;

      nodeType.prototype.onNodeCreated = function () {
        console.log("Create PoseNode");
        const r = onNodeCreated
          ? onNodeCreated.apply(this, arguments)
          : undefined;

        let openPoseNode = app.graph._nodes.filter(
            (wi) => wi.type == "PoseNode"
          ),
          nodeName = `Pose_${openPoseNode.length}`;

        LS_Poses =
          localStorage.getItem("ComfyUI_Poses") &&
          JSON.parse(localStorage.getItem("ComfyUI_Poses"));
        if (!LS_Poses) {
          localStorage.setItem("ComfyUI_Poses", JSON.stringify({}));
          LS_Poses = JSON.parse(localStorage.getItem("ComfyUI_Poses"));
        }

        if (!Object.hasOwn(LS_Poses, nodeName)) {
          LS_Poses[nodeName] = {};
        }

        createOpenPose.apply(this, [this, nodeName, {}, app]);
        setTimeout(() => {
          this.openPose.uploadPoseFile(`${nodeName}.png`);
        }, 1);

        this.setSize([530, 620]);

        return r;
      };
    }
  },
});