// Define a class for all of the tiles in the TilePalette defined below.  Each
// tile has a DrawPane that is used to render a single DrawItem.
isc.defineClass("DrawItemTile", "SimpleTile").addProperties({
    initWidget : function () {
        this.Super("initWidget", arguments);

        this.drawPane = isc.DrawPane.create({
            autoDraw: false,
            width: "100%",
            height: "100%",
            gradients: commonGradients
        });
        this.addChild(this.drawPane);

        this.record = this.getRecord();
    },

    getInnerHTML : function () {
        // We do not want the default HTML generated by the superclass SimpleTile's
        // getInnerHTML() method to be drawn, so just return a blank HTML string here.
        return "&nbsp;";
    },

    drawRecord : function (record) {
        var tilePalette = this.creator,
            drawItem = tilePalette.makeEditNode(record).liveObject;

        if (!isc.isAn.Instance(drawItem)) {
            drawItem = isc[drawItem._constructor].create(isc.addProperties({}, drawItem, {
                autoDraw: false
            }));
        }

        this.drawPane.addDrawItem(drawItem);
    },

    draw : function () {
        var ret = this.Super("draw", arguments);
        this.drawRecord(this.getRecord());
        return ret;
    },

    redraw : function () {
        var drawPane = this.drawPane,
            record = this.getRecord();

        if (record !== this.record) {
            drawPane.erase();

            this.drawRecord(record);
            this.record = record;
        }

        return this.Super("redraw", arguments);
    }
});


isc.TilePalette.create({
    ID: "tilePalette",
    width: 270,
    tileWidth: 80,
    tileHeight: 80,
    canDragTilesOut: true,

    tileConstructor: "DrawItemTile",
    fields: [{
        name: "type"
    }, {
        name: "title",
        title: "Component"
    }],

    initWidget : function () {
        this.Super("initWidget", arguments);

        // We are supplying the component data inline for this example.
        // However, the TilePalette is a subclass of TileGrid, so you could
        // also use a dataSource.
        var data = this.generateData(this.tileWidth, this.tileHeight, 3);

        // Set default properties on the DrawItems offered in the palette.
        var defaultDrawItemProperties = {
            keepInParentRect: true,
            lineWidth: 1
        };
        for (var i = 0, len = data.length; i < len; ++i) {
            var defaults = data[i].defaults;
            if (defaults == null) {
                defaults = data[i].defaults = {};
            }
            if (data[i].type != "DrawLine" && data[i].type != "DrawCurve" && data[i].type != "DrawLinePath") {
                defaultDrawItemProperties.shadow = { color: '#333333', blur: 2, offset: [1,1] };
            }
            isc.addDefaults(defaults, defaultDrawItemProperties);
        }

        this.setData(data);
    },

    // Creates PaletteNodes for each of nine different types of DrawItems.  The
    // defaults of the nodes are set so that the shapes will fit in the grid
    // tiles.
    generateData : function (tileWidth, tileHeight, topPadding, leftPadding, rightPadding, bottomPadding) {
        if (tileHeight == null) tileHeight = tileWidth;

        if (topPadding == null) topPadding = 2;
        if (leftPadding == null) leftPadding = topPadding;
        if (rightPadding == null) rightPadding = leftPadding;
        if (bottomPadding == null) bottomPadding = topPadding;

        tileWidth -= (leftPadding + rightPadding);
        tileHeight -= (topPadding + bottomPadding);

        var xc = leftPadding + (tileWidth / 2),
            yc = topPadding + (tileHeight / 2),
            width = tileWidth - leftPadding - rightPadding,
            height = tileHeight - topPadding - bottomPadding,
            center = [Math.round(xc), Math.round(yc)],

            // variables for the DrawRect:
            smallAngle = Math.PI / 5,
            rectPoints = isc.DrawPane.getPolygonPoints(
                width, height, xc, yc,
                [smallAngle, Math.PI - smallAngle, Math.PI + smallAngle, -smallAngle]),
            rectTop = rectPoints[1][1],
            rectLeft = rectPoints[1][0],
            rectWidth = rectPoints[3][0] - rectLeft,
            rectHeight = rectPoints[3][1] - rectTop;

        // Define the default properties for three DrawCurves.
        var curveDefaults = {
                startPoint: [200, 50],
                endPoint: [300, 150],
                controlPoint1: [250, 0],
                controlPoint2: [250, 200]
            },
            oneArrowCurveDefaults = {
                endArrow: "block",
                startPoint: [200, 50],
                endPoint: [300, 150],
                controlPoint1: [250, 0],
                controlPoint2: [250, 200]
            },
            twoArrowCurveDefaults = {
                startArrow: "block",
                endArrow: "block",
                startPoint: [200, 50],
                endPoint: [300, 150],
                controlPoint1: [250, 0],
                controlPoint2: [250, 200]
            };

        // Rescale the three DrawCurves to center them at (xc, yc) and to fit them within the
        // width and height.
        isc.DrawPane.scaleAndCenterBezier(
            width, height - 20, xc, yc,
            curveDefaults.startPoint, curveDefaults.endPoint,
            curveDefaults.controlPoint1, curveDefaults.controlPoint2);
        isc.DrawPane.scaleAndCenterBezier(
            width, height - 20, xc, yc,
            oneArrowCurveDefaults.startPoint, oneArrowCurveDefaults.endPoint,
            oneArrowCurveDefaults.controlPoint1, oneArrowCurveDefaults.controlPoint2);
        isc.DrawPane.scaleAndCenterBezier(
            width, height - 20, xc, yc,
            twoArrowCurveDefaults.startPoint, twoArrowCurveDefaults.endPoint,
            twoArrowCurveDefaults.controlPoint1, twoArrowCurveDefaults.controlPoint2);

        var data = [{
            title: "Line",
            type: "DrawLine",
            defaults: {
                startPoint: [Math.round(xc - width / 2), Math.round(yc - height / 2)],
                endPoint: [Math.round(xc + width / 2), Math.round(yc + height / 2)]
            }
        }, {
            title: "Line w/arrow",
            type: "DrawLine",
            defaults: {
                startPoint: [Math.round(xc - width / 2), Math.round(yc - height / 2)],
                endPoint: [Math.round(xc + width / 2), Math.round(yc + height / 2)],
                lineWidth: 1,
                endArrow: "block"
            }
        }, {
            title: "Line w/two arrows",
            type: "DrawLine",
            defaults: {
                startPoint: [Math.round(xc - width / 2), Math.round(yc - height / 2)],
                endPoint: [Math.round(xc + width / 2), Math.round(yc + height / 2)],
                startArrow: "block",
                endArrow: "block"
            }
        }, {
            title: "Curve",
            type: "DrawCurve",
            defaults: curveDefaults
        }, {
            title: "Curve w/arrow",
            type: "DrawCurve",
            defaults: oneArrowCurveDefaults
        }, {
            title: "Curve w/two arrows",
            type: "DrawCurve",
            defaults: twoArrowCurveDefaults
        }, {
            title: "Line Path",
            type: "DrawLinePath",
            defaults: {
                startPoint: [Math.round(xc - width / 2), Math.round(yc - (height - 10) / 2)],
                endPoint: [Math.round(xc + width / 2), Math.round(yc + (height - 20) / 2)],
                endArrow: null
            }
        }, {
            title: "Line Path w/arrow",
            type: "DrawLinePath",
            defaults: {
                startPoint: [Math.round(xc - width / 2), Math.round(yc - (height - 10) / 2)],
                endPoint: [Math.round(xc + width / 2), Math.round(yc + (height - 20) / 2)],
                endArrow: "block"
            }
        }, {
            title: "Line Path w/two arrows",
            type: "DrawLinePath",
            defaults: {
                startPoint: [Math.round(xc - width / 2), Math.round(yc - (height - 10) / 2)],
                endPoint: [Math.round(xc + width / 2), Math.round(yc + (height - 20) / 2)],
                startArrow: "block",
                endArrow: "block"
            }
        }, {
            title: "Rectangle",
            type: "DrawRect",
            defaults: {
                top: rectTop,
                left: rectLeft,
                width: rectWidth,
                height: rectHeight,
                fillGradient: "rect"
            }
        }, {
            title: "Rounded Rectangle",
            type: "DrawRect",
            defaults: {
                top: rectTop,
                left: rectLeft,
                width: rectWidth,
                height: rectHeight,
                rounding: 0.25,
                fillGradient: "rect"
            }
        }, {
            title: "Oval",
            type: "DrawOval",
            defaults: {
                top: rectTop,
                left: rectLeft,
                width: rectWidth,
                height: rectHeight,
                fillGradient: "oval"
            }
        }, {
            title: "Triangle",
            type: "DrawTriangle",
            defaults: {
                points: isc.DrawPane.getRegularPolygonPoints(3, width, height, xc, yc, Math.PI / 2),
                fillGradient: "triangle"
            }
        }, {
            title: "Diamond",
            type: "DrawDiamond",
            defaults: {
                top: rectTop,
                left: rectLeft,
                width: rectWidth,
                height: rectHeight,
                fillGradient: "diamond"
            }
        }, {
            title: "Label",
            type: "DrawLabel",
            defaults: {
                contents: "Text",
                alignment: "center",
                left: xc/2,
                top: yc/2
            }
        }];
        for (var i = 0; i < data.length; ++i) {
            data[i].defaults.titleLabelProperties = {
                lineColor: "#222222"
            };
            data[i].editProxyProperties = {
                inlineEditEvent: "dblOrKeypress"
            };
            
        }
        return data;
    }
});
