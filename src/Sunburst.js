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

        const maxRadius = (Math.min(this.props.width, this.props.height) / 2);
        this.y = scaleSqrt()
            .range([maxRadius * .1, maxRadius]);

        this.x= scaleLinear()
        //.domain([0, 10]) // For initial build-in animation
            .range([0, 2 * Math.PI])
            .clamp(true);

        this.arc = d3Arc()
            .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, this.x(d.x0))); })
            .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, this.x(d.x1))); })
            .innerRadius(function(d) { return Math.max(0, this.y(d.y0)); })
            .outerRadius(function(d) { return Math.max(0, this.y(d.y1)); });

        /*
            .startAngle(d => this.x(d.x0))
            .endAngle(d => this.x(d.x1))
            .innerRadius(d => Math.max(0, this.y(d.y0)))
            .outerRadius(d => Math.max(0, this.y(d.y1)));
        */


        this.partition = d3Partition()
        //   .size([10 , 1])

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

        var root = d3Hierarchy(this.props.data)
        root.sum(function(d) { return !d.children || d.children.length === 0 ? d.count :0; });

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

            var color_palettes = [['#4abdac', '#fc4a1a', '#f7b733'], ['#f03b20', '#feb24c', '#ffeda0'], ['#007849', '#0375b4', '#ffce00'], ['#373737', '#dcd0c0', '#c0b283'], ['#e37222', '#07889b', '#eeaa7b'], ['#062f4f', '#813772', '#b82601'], ['#565656', '#76323f', '#c09f80']];
            var color = scaleLinear().domain([0, 0.5, 1]).range(color_palettes[~~(Math.random() * 6)])

            var gSlices = this.svg.selectAll("g").data(this.partition(root).descendants(), function (d) { return d.data.current; }).enter().append("g");
            gSlices.exit().remove();
            gSlices.append("path")
                .style("fill", function (d) { return d.parent ? color(d.x0) : "white"; })
                .on("click", this._click)
                .append("title").text(function (d) { return d.data.name; });   // Return white for root.

            //gSlices.append("text").attr("dy", ".35em").text(function (d) { return d.parent ? d.data.current: ""; }).attr("id", function (d) { return "w" + d.data.current; }); // TODO: was d.data.word
            this.svg.selectAll("path").append("title").text(function (d) { return d.data.current; })

        } else {
            this.svg.selectAll("path").data(this.partition(root).descendants());
        }

        this.svg.selectAll("path").transition("update").duration(750).attrTween("d", function (d, i) {
            return this.arcTweenPath(d, i).bind(this);
        }.bind(this));

        /*
        this.svg.selectAll("text").transition("update").duration(750).attrTween("transform", function (d, i) { return this.arcTweenText(d, i).bind(this); })
            .attr('text-anchor', function (d) { return d.textAngle > 180 ? "start" : "end"; })
            .attr("dx", function (d) { return d.textAngle > 180 ? -13 : 13; })
            .attr("opacity", function (e) { return e.x1 - e.x0 > 0.01 ? 1 : 0; });
        */
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
         var yr = d3Interpolate(this.y.range(), [this.node.y0 ? 40 : 0, this.radius]);

         return function (t) {
            this.x.domain(xd(t));
            this.y.domain(yd(t)).range(yr(t));
            return tween(t).bind(this);
         };
      } else {
         return tween.bind(this);
      }
   }


   _click(d) {
      this.node = d;

      this.svg.selectAll("path").transition("click").duration(750).attrTween("d", function (d, i) { return this.arcTweenPath(d, i); });
      this.svg.selectAll("text").transition("click").duration(750).attrTween("transform", function (d, i) { return this.arcTweenText(d, i); })
         .attr('text-anchor', function (d) { return d.textAngle > 180 ? "start" : "end"; })
         .attr("dx", function (d) { return d.textAngle > 180 ? -13 : 13; })
         .attr("opacity", function (e) {
            if (e.x0 >= d.x0 && e.x1 <= d.x1) {
               return (e.x1 - e.x0 > 0.01 ? 1 : 0);
            } else {
               return 0;
            }
         })
    }

        /*
   // When switching data: interpolate the arcs in data space.
   //$("#w1Jo").attr("transform").substring(10,$("#w1Jo").attr("transform").search(",")) 
   function arcTweenText(a, i) {

      var oi = d3.interpolate({ x0: (a.x0s ? a.x0s : 0), x1: (a.x1s ? a.x1s : 0), y0: (a.y0s ? a.y0s : 0), y1: (a.y1s ? a.y1s : 0) }, a);
      function tween(t) {
         var b = oi(t);
         var ang = ((x((b.x0 + b.x1) / 2) - Math.PI / 2) / Math.PI * 180);
         b.textAngle = (ang > 90) ? 180 + ang : ang;
         a.centroid = arc.centroid(b);
         //b.opacity = (b.x1 - b.x0) > 0.01 ? 0 : 0;
         //console.log(b.data.name + " x1:" + b.x1 + " x0:" + b.x0);
         return "translate(" + arc.centroid(b) + ")rotate(" + b.textAngle + ")";
      }
      return tween;
   }
   */

   
    ___update() {

        if (!this.props.data) return;

        if (!this.svg) {
            const w = this.props.width
            const h = this.props.height
            const el = d3Select('#' + this.props.domId)

            this.svg = el.append('svg');
            this.svg
              .style('width', w + 'px')
              .style('height', h + 'px')
              .attr('viewBox', `${-w/2} ${-h/2} ${w} ${h}`);
            this.canvas = this.svg.append('g');
        }

        //const hierData = d3Hierarchy(this.data, accessorFn(state.children))
        const hierData = d3Hierarchy(this.props.data)
          .sum(this.props.sumFunc);
        /*
        if (state.sort) {
          hierData.sort(state.sort);
        }
        */
        d3Partition().padding(0)(hierData);
        hierData.descendants().forEach((d, i) => d.id = i); // Mark each node with a unique ID
        const layoutData = hierData.descendants();

        //const focusD = state.focusOnNode || { x0: 0, x1: 1, y0: 0, y1: 1 };
        const focusD = { x0: 0, x1: 1, y0: 0, y1: 1 };

        const slice = this.canvas.selectAll('.slice')
          .data(
            layoutData
              .filter(d => // Show only slices with a large enough angle
                d.x1 >= focusD.x0
                && d.x0 <= focusD.x1
                && (d.x1-d.x0)/(focusD.x1-focusD.x0) > this.props.minSliceAngle/360
              ),
            d => d.id
          );

        //const colorOf = accessorFn(state.color);
        const transition = d3Transition().duration(this.props.transitionDuration);

        // Apply zoom
        this.svg.transition(transition)
          .tween('scale', () => {
            const xd = d3Interpolate(this.x.domain(), [focusD.x0, focusD.x1]);
            const yd = d3Interpolate(this.y.domain(), [focusD.y0, 1]);
            return t => {
              this.x.domain(xd(t));
              this.y.domain(yd(t));
            };
          });

        // Exiting
        const oldSlice = slice.exit().transition(transition).style('opacity', 0).remove();
        oldSlice.select('path.main-arc').attrTween('d', d => () => this.arc(d));

        // Entering
        const newSlice = slice.enter().append('g')
            .attr('class', 'slice')
            .style('opacity', 0)
            .on('click', function(d) {
                d3Event.stopPropagation();
                (this._click(d))
            }.bind(this))

        newSlice.append('path')
          .attr('class', 'main-arc')
            .style('fill', d => this._colorize(d))
            .attr('stroke', '#fff')
            .attr('stroke-width', '1')

        // Entering + Updating
        const allSlices = slice.merge(newSlice);

        allSlices.style('opacity', 1);

        allSlices.select('path.main-arc').transition(transition)
          .attrTween('d', d => () => this.arc(d))
            .style('fill', d => this._colorize(d))
            .attr('stroke', '#fff')
            .attr('stroke-width', '1')
    }

    _click(d) { // eslint-disable-line
        //self.props.onSelect && self.props.onSelect(d);
        this.svg.selectAll('path').transition().duration(1000).attrTween('d', this.arcTweenZoom(d));
    }

    arcTweenZoom(d) { // eslint-disable-line
        const xd = d3Interpolate(this.x.domain(), [d.x0, d.x1]), // eslint-disable-line
            yd = d3Interpolate(this.y.domain(), [d.y0, 1]),
            yr = d3Interpolate(this.y.range(), [d.y0 ? 40 : 0, this.radius]);
        return function (data, i) {
            return i
                    ? () => this.arc(data)
                    : (t) => { this.x.domain(xd(t)); this.y.domain(yd(t)).range(yr(t)); return this.arc(data); };
        }.bind(this);
    }

    _iiclick(d) {

        this.svg.transition()
            .duration(750)
            .tween("scale", function() {
                var xd = d3Interpolate(this.x.domain(), [d.x0, d.x1]),
                yd = d3Interpolate(this.y.domain(), [d.y0, 1]),
                yr = d3Interpolate(this.y.range(), [d.y0 ? 20 : 0, this.radius]);
            return function(t) { this.x.domain(xd(t)); this.y.domain(yd(t)).range(yr(t)); }.bind(this);
            }.bind(this))

        this.svg.transition()
            .duration(750)
            .selectAll("path")
                .attrTween("d", function(d) { return function() { return this.arc(d); }.bind(this); }.bind(this));
    }


    moveStackToFront(elD) {
        console.log('eid', elD)
        this.svg.selectAll('.slice').filter(d => d === elD)
            .each(function(d, i, a) {
                var node = a[i]
                node.parentNode.appendChild(node);
                if (d.parent) { this.moveStackToFront(d.parent); }
            })
    }

    _iiiclick(d = { x0: 0, x1: 1, y0: 0, y1: 1 }) {
        // Reset to top-level if no data point specified

        const transition = this.svg.transition()
            .duration(750)
            .tween('scale', function(){
                const xd = d3Interpolate(this.x.domain(), [d.x0, d.x1]),
                yd = d3Interpolate(this.y.domain(), [d.y0, 1]);
                return t => { this.x.domain(xd(t)); this.y.domain(yd(t)); };
            }.bind(this));

        transition.selectAll('path.main-arc')
            .attrTween('d', d => function(){ this.arc(d) }.bind(this));

        //this.moveStackToFront(d);
    }

    _iclick(elD) {
        console.log(elD)
        this.svg.selectAll('.slice').filter(d => d === elD)
            .each(function(d, i, a) {
                var node = a[i]
                node.parentNode.appendChild(node);
                if (d.parent) 
                    this._click(d.parent)
            }.bind(this))
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
