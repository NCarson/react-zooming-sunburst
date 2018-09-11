import React from 'react';
import { isEqual } from 'lodash/lang';
import PropTypes from 'prop-types'

import { hsl } from 'd3-color';
import { scaleLinear, scaleSqrt } from 'd3-scale';
import { select, event } from 'd3-selection';
import { hierarchy, partition } from 'd3-hierarchy';
import { arc } from 'd3-shape';
import { interpolate } from 'd3-interpolate';
import { transition } from 'd3-transition'; // eslint-disable-line no-unused-vars

/*
https://github.com/mojoaxel/d3-sunburst
https://github.com/ebemunk/chess-dataviz
https://github.com/ArbaazDossani/react-zoomable-sunburst-d3-v4
*/

class Sunburst extends React.Component {

    static propTypes = {
        data: PropTypes.object.isRequired,
        width: PropTypes.string.isRequired,
        height: PropTypes.string.isRequired,

		// requried /w/ default
        domId: PropTypes.string,
        scale: PropTypes.string.isRequired,
        tooltip: PropTypes.bool.isRequired,
        tooltipFormatter: PropTypes.func.isRequired,

        onSelect: PropTypes.func,
        onMouseover: PropTypes.func,
        onMouseout: PropTypes.func,
    }

    static defaultProps = {
        domId:'sunburst-container',
        scale:'linear',
        tooltip: true,
        tooltipFormatter: (data) => data.name
    }

    constructor(props) {
        super(props);

        const w = this.props.width
        const h = this.props.height

        this.radius = (Math.min(w, h) / 2) - 10
        this.x = scaleLinear().range([0, 2 * Math.PI])
        this.y = this.props.scale === 'linear' ? scaleLinear().range([0, this.radius]) : scaleSqrt().range([0, this.radius])
        this.partition = partition()

        this.arc = arc()
            .startAngle(d => Math.max(0, Math.min(2 * Math.PI, this.x(d.x0))))
            .endAngle(d => Math.max(0, Math.min(2 * Math.PI, this.x(d.x1))))
            .innerRadius(d => Math.max(0, this.y(d.y0)))
            .outerRadius(d => Math.max(0, this.y(d.y1)))

        this.hueDXScale = scaleLinear()
            .domain([0, 1])
            .range([0, 360])

        this.rootData = null
        this.svg = null
        this.firstBuild = null
        this.node = null
        this.tooltipDom = null
    }

    componentDidMount() {
        this.update();
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        if (!isEqual(this.props, nextProps)) {
            this.update(nextProps);
        }
    }

    _setTooltipCallbacks() {

        this.tooltipDom = select(`#${this.props.domId}`)
            .append('div')
			.attr('class', 'sunburst-tooltip')
            .style('position', 'absolute')
            .style('z-index', '10')
            .style('opacity', '0')
            .style('text-align', 'center')
            .style('border-radius', '8px')
            .style('pointer-events', 'none')
            .style('background', 'lightsteelblue')
            .style('padding', '3px')

        this.svg.selectAll('path')
            .on("mouseover", function(d) {		
                if (this.props.tooltip) {
                    this.tooltipDom.transition()
                        .style("opacity", .9)
                        .duration(200)

                    this.tooltipDom.html((this.props.tooltipFormatter(d.data)))
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

    _onClick(d) {
        this.props.onSelect && this.props.onSelect(d);
        this.svg.selectAll('path').transition().duration(1000).attrTween('d', this._arcTweenZoom(d).bind(this));
    }

    // figures out the arc length for a node
    _arcTweenData(a, i, node) {    // eslint-disable-line
        const oi = interpolate({ x0: (a.x0s ? a.x0s : 0), x1: (a.x1s ? a.x1s : 0) }, a);
        function _tween(t) {
            const b = oi(t);
            a.x0s = b.x0;     // eslint-disable-line
            a.x1s = b.x1;     // eslint-disable-line
            return this.arc(b);
        }
        var tween = _tween.bind(this)
        if (i === 0) {
            const xd = interpolate(this.x.domain(), [this.node.x0, this.node.x1]);
            return function (t) {
                this.x.domain(xd(t));
                return tween(t);
            }.bind(this);
        } else {    // eslint-disable-line
            return tween;
        }
    }

    _arcTweenZoom(d) {
        const xd = interpolate(this.x.domain(), [d.x0, d.x1]), // eslint-disable-line
            yd = interpolate(this.y.domain(), [d.y0, 1]),
            yr = interpolate(this.y.range(), [d.y0 ? 40 : 0, this.radius]);
        return function (data, i) {
            return i
                    ? () => this.arc(data)
                    : (t) => { this.x.domain(xd(t)); this.y.domain(yd(t)).range(yr(t)); return this.arc(data); };
        };
    }

    _firstFill() {
        this.svg.selectAll('path').data(this.partition(this.rootData).descendants()).enter().append('path')
        .style('fill', (d) => {
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
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', '1')
        .on('click', this._onClick.bind(this))
    }

    update() {
        this.rootData = hierarchy(this.props.data);
        this.svg = select('svg').append('g').attr('transform', `translate(${this.props.width / 2},${this.props.height / 2})`)
        this.firstBuild = true;
        this.node = this.rootData;
        this.rootData.sum(d => d.size);

        if (this.firstBuild) {
            this.firstBuild = false
            this._firstFill()
        } else {
            this.svg.selectAll('path').data(this.partition(this.rootData).descendants());
        }
        this.svg.selectAll('path').transition().duration(1000).attrTween('d', (d, i) => this._arcTweenData(d, i));
        this._setTooltipCallbacks()
    }

    render() {
        return (
            <div id={this.props.domId}>
                <svg style={{ width: parseInt(this.props.width, 10) || 480, height: parseInt(this.props.height, 10) || 400 }} id={`${this.props.domId}-svg`} />
            </div>
        );
    }
}

export default Sunburst;
