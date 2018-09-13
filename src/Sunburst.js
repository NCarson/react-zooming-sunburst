import React from 'react';
import { isEqual } from 'lodash/lang';
import PropTypes from 'prop-types'

import { hsl } from 'd3-color';
import { select as d3Select, event as d3Event } from 'd3-selection';
import { scaleLinear, scaleSqrt } from 'd3-scale';
import { hierarchy as d3Hierarchy, partition as d3Partition } from 'd3-hierarchy';
import { arc as d3Arc } from 'd3-shape';
import { path as d3Path } from 'd3-path';
import { interpolate as d3Interpolate } from 'd3-interpolate';
import { transition as d3Transition } from 'd3-transition';

/*
https://github.com/vasturiano/sunburst-chart
https://github.com/mojoaxel/d3-sunburst
https://github.com/ebemunk/chess-dataviz
https://github.com/ArbaazDossani/react-zoomable-sunburst-d3-v4
*/
    //https://beta.observablehq.com/@mbostock/d3-zoomable-sunburst

class Sunburst extends React.Component {

    static propTypes = {
        data: PropTypes.object.isRequired,
        width: PropTypes.string.isRequired,
        height: PropTypes.string.isRequired,

		// requried /w/ default
        domId: PropTypes.string,
        tooltip: PropTypes.bool.isRequired,
        tooltipFunc: PropTypes.func.isRequired,
        sumFunc: PropTypes.func.isRequired,
        minSliceAngle: PropTypes.number.isRequired,
        transitionDuration: PropTypes.number.isRequired,

        onSelect: PropTypes.func,
        onMouseover: PropTypes.func,
        onMouseout: PropTypes.func,
    }

    static defaultProps = {
        domId:'sunburst-wrapper',
        tooltip: true,
        tooltipFunc: (data) => data.name,
        sumFunc: (data) => data.size,
        minSliceAngle: .2,
        transitionDuration: 750,
    }

    constructor(props) {
        super(props);

        this.radius = (Math.min(this.props.width, this.props.height) / 2);
        this.y = scaleSqrt()
            .range([0, this.radius]);

        this.x= scaleLinear()
            .range([0, 2 * Math.PI])

        this.arc = d3Arc()
        /*
            .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, this.x(d.x0))); })
            .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, this.x(d.x1))); })
            .innerRadius(function(d) { return Math.max(0, this.y(d.y0)); })
            .outerRadius(function(d) { return Math.max(0, this.y(d.y1)); });
        */
            .startAngle(d => this.x(d.x0))
            .endAngle(d => this.x(d.x1))
            .innerRadius(d => Math.max(0, this.y(d.y0)))
            .outerRadius(d => Math.max(0, this.y(d.y1)));

        this.partition = d3Partition()

        this.hueDXScale = scaleLinear()
            .domain([0, 1])
            .range([0, 360])

        this.chartId = Math.round(Math.random() * 1e12); // Unique ID for DOM elems

        this.svg = null
        this.canvas = null
        this.node = null
    }

    componentDidMount() {
        this.update();
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        if (!isEqual(this.props, nextProps)) {
            this.update(nextProps);
        }
    }

    _colorize(d) {
        let hue;
        const current = d;
        if (current.depth === 0) {
            return '#33cccc';
        }
        if (current.depth <= 1) {
            hue = this.hueDXScale(d.x0);
            current.fill = hsl(hue, 0.5, 0.6);
            return current.fill;
        }
        current.fill = current.parent.fill.brighter(0.5);
        const thishsl = hsl(current.fill);
        hue = this.hueDXScale(current.x0);
        const colorshift = thishsl.h + (hue / 4);
        return hsl(colorshift, thishsl.s, thishsl.l);
    }

    update() {
        if (!this.props.data) return;

        const root = d3Hierarchy(this.props.data)
            .sum(function(d) { return !d.children || d.children.length === 0 ? d.count :0; });
        const data = this.partition(root)
            .descendants()
            .filter( (d) =>  d.x1 - d.x0 > 0.001) // 0.005 radians = 0.29 degrees

        if (!this.svg) {
            const w = this.props.width
            const h = this.props.height
            const el = d3Select('#' + this.props.domId)

            this.svg = el.append('svg');
            this.svg
              .style('width', w + 'px')
              .style('height', h + 'px')
              .attr('viewBox', `${-w/2} ${-h/2} ${w} ${h}`);
            //this.canvas = this.svg.append('g');
            this.svg = d3Select("svg").append("g").attr("id", "bigG")

            var gSlices = this.svg.selectAll("g")
                .data(data, function (d) { 
                    return d.data.current; }
                ).enter().append("g");

            gSlices.exit().remove();

            gSlices.append("path")
                .style("fill", function (d) { 
                    return d.parent ? this._colorize(d) : "white"; 
                }.bind(this))
                .style('stroke', 'gray')

            gSlices.append("text")
                .attr("dy", ".35em")
                .text(function (d) { return d.parent ? d.data.san: ""; })
                .attr("id", function (d) { return "w" + d.data.current; })
                .attr('text-anchor', 'end')
                .style('z-index', 10)
                
            this.svg.selectAll("path")
                .append("title")
                .text(function (d) { return d.data.current; })

        } else {
            this.svg.selectAll("path")
                .data(data)
        }

        this.svg.selectAll("path")
            .on("click", this._click.bind(this))

        this.svg.selectAll("text")
            .transition("update")
            .duration(750)
            .attrTween("transform", function (d, i) { return this.arcTweenText(d, i).bind(this); }.bind(this))
            //.attr('text-anchor', function (d) { return d.textAngle > 180 ? "start" : "end"; })
            //.attr("dx", function (d) { return d.textAngle > 180 ? -13 : 13; })
            .attr("opacity", function (e) { return e.x1 - e.x0 > 0.01 ? 1 : 0; });

        this._updatePath()
    }

    _click(d) {
        console.log('click', d)
        this.node = d;

        //this._updatePath()
        //this.svg.selectAll("path").transition("click").duration(750).attrTween("d", function (d, i) { return this.arcTweenPath(d, i).bind(this); }.bind(this));
        this.svg.transition()
		  .duration(750) // duration of transition
		  .tween("scale", function() {
				var xd = d3Interpolate(this.x.domain(), [d.x0, d.x1]),
				yd = d3Interpolate(this.y.domain(), [d.y0, 1]),
				yr = d3Interpolate(this.y.range(), [d.y0 ? (40) : 0, this.radius]);
				return function(t) { this.x.domain(xd(t)); this.y.domain(yd(t)).range(yr(t)); }.bind(this);
			}.bind(this))
			.selectAll("path")
			.attrTween("d", function(d) { return function() { return this.arc(d); }.bind(this); }.bind(this));

        this.svg.selectAll("text")
           .transition("click")
           .duration(750)
           .attrTween("transform", function (d, i) { return this.arcTweenText(d, i); }.bind(this))
            //.attr('text-anchor', function (d) { return d.textAngle > 180 ? "start" : "end"; })
            //.attr("dx", function (d) { return d.textAngle > 180 ? -13 : 13; })
            /*
           .attr("opacity", function (e) {
                if (e.x0 >= d.x0 && e.x1 <= d.x1) {
                   return (e.x1 - e.x0 > 0.01 ? 1 : 0);
                } else {
                   return 0;
                }
           })
           */
    }

    _updatePath() {
        this.svg.selectAll("path")
            .transition("update")
            .duration(750).attrTween("d", function (d, i) {
                return this.arcTweenPath(d, i).bind(this);
            }.bind(this));
    }

   // When switching data: interpolate the arcs in data space.
    arcTweenPath(a, i) {
       // (a.x0s ? a.x0s : 0) -- grab the prev saved x0 or set to 0 (for 1st time through)
       // avoids the stash() and allows the sunburst to grow into being
        var oi = d3Interpolate({ x0: (a.x0s ? a.x0s : 0), x1: (a.x1s ? a.x1s : 0), y0: (a.y0s ? a.y0s : 0), y1: (a.y1s ? a.y1s : 0) }, a);
        function tween(t) {
            var b = oi(t);
            a.x0s = b.x0;
            a.x1s = b.x1;
            a.y0s = b.y0;
            a.y1s = b.y1;
            return this.arc(b);
        }
        if (i == 0 && this.node) {   // If we are on the first arc, adjust the x domain to match the root node at the current zoom level.
            var xd = d3Interpolate(this.x.domain(), [this.node.x0, this.node.x1]);
            var yd = d3Interpolate(this.y.domain(), [this.node.y0, 1]);
            var yr = d3Interpolate(this.y.range(), [this.node.y0 ? 0 : 0, this.radius]);

            return function (t) {
                this.x.domain(xd(t));
                this.y.domain(yd(t)).range(yr(t));
                return tween.bind(this)(t);
            };
        } else {
            return tween.bind(this);
        }
    }
    // When switching data: interpolate the arcs in data space.
    //$("#w1Jo").attr("transform").substring(10,$("#w1Jo").attr("transform").search(",")) 
    arcTweenText(a, i) {

        var oi = d3Interpolate({ x0: (a.x0s ? a.x0s : 0), x1: (a.x1s ? a.x1s : 0), y0: (a.y0s ? a.y0s : 0), y1: (a.y1s ? a.y1s : 0) }, a);
        function tween(t) {
            var b = oi(t);
            var ang = ((this.x((b.x0 + b.x1) / 2) - Math.PI / 2) / Math.PI * 180);
            //b.textAngle = (ang > 90) ? 180 + ang : ang;
            b.textAngle = 0
            a.centroid = this.arc.centroid(b);
            //b.opacity = (b.x1 - b.x0) > 0.01 ? 0 : 0;
            //console.log(b.data.name + " x1:" + b.x1 + " x0:" + b.x0);
            return "translate(" + this.arc.centroid(b) + ")rotate(" + b.textAngle + ")";
        }
        return tween.bind(this);
    }

    render() {
        return (
            <div id={this.props.domId} />
        );
    }

    /*
    _setTooltipCallbacks() {

        this.tooltipDom = select(`#${this.props.domId}`)
            .append('div')
			.attr('class', 'sunburst-tooltip')
            .style('position', 'absolute')
            .style('z-index', '10')
            .style('opacity', '0')
            .style('text-align', 'center')
            .style('border-radius', '8px')
            .style('max-width', '20em')
            .style('pointer-events', 'none')
            .style('background', 'lightsteelblue')
            .style('padding', '3px')

        this.svg.selectAll('path')
            .on("mouseover", function(d) {		
                if (this.props.tooltip) {
                    this.tooltipDom.transition()
                        .style("opacity", .9)
                        .duration(200)

                    const node = d.data
                    const txt = `${node.san} ${node.opening} ${node.eco_variation}` 

                    this.tooltipDom.html(this.props.tooltipFunc(d.data))
                        .style("left", (event.pageX) + "px")		
                        .style("top", (event.pageY - 28) + "px")
                }
                this.props.onMouseover && this.props.onMouseover(d);

            }.bind(this))					
            .on("mouseout", function(d) {		
                this.props.tooltip && this.tooltipDom.transition()		
                    .style("opacity", 0)
                    .duration(500)

                this.props.onMouseout && this.props.onMouseout(d);
            }.bind(this));
    }
    */

    _onClick(d) {
        this.props.onSelect && this.props.onSelect(d);
        this.svg.selectAll('path').transition().duration(1000).attrTween('d', this._arcTweenZoom(d).bind(this));
    }


}

export default Sunburst;
