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
            .domain([0, 10]) // For initial build-in animation
            .range([0, 2 * Math.PI])
            .clamp(true);

        this.arc = d3Arc()
            .startAngle(d => this.x(d.x0))
            .endAngle(d => this.x(d.x1))
            .innerRadius(d => Math.max(0, this.y(d.y0)))
            .outerRadius(d => Math.max(0, this.y(d.y1)));



        this.hueDXScale = scaleLinear()
            .domain([0, 1])
            .range([0, 360])

        this.chartId = Math.round(Math.random() * 1e12); // Unique ID for DOM elems

        this.svg = null
        this.canvas = null
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

        function click(d, x, y, radius, arc) {
            this.svg.transition()
                .duration(750)
                .tween("scale", function() {
                    var xd = d3Interpolate(x.domain(), [d.x0, d.x1]),
                    yd = d3Interpolate(y.domain(), [d.y0, 1]),
                    yr = d3Interpolate(y.range(), [d.y0 ? 20 : 0, radius]);
                return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); };
                })
            .selectAll("path")
              .attrTween("d", function(d) { return function() { return arc(d); }; });
        }

        // Entering
        const newSlice = slice.enter().append('g')
            .attr('class', 'slice')
            .style('opacity', 0)
            .on('click', (d) => {
                d3Event.stopPropagation();
                this._click(d)
            })

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
    _click(d) {

        this.svg.transition()
            .duration(750)
            .tween("scale", function() {
                var xd = d3Interpolate(this.x.domain(), [d.x0, d.x1]),
                yd = d3Interpolate(this.y.domain(), [d.y0, 1]),
                yr = d3Interpolate(this.y.range(), [d.y0 ? 20 : 0, this.radius]);
            return function(t) { this.x.domain(xd(t)); this.y.domain(yd(t)).range(yr(t)); }.bind(this);
            }.bind(this))
        .selectAll("path")
          .attrTween("d", function(d) { return function() { return this.arc(d); }.bind(this); }.bind(this));
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
