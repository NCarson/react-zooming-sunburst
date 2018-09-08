import React from 'react';
import { isEqual } from 'lodash/lang';
import * as d3 from 'd3';
//import * as utils from './utils';
/**
 * Sunburst Chart React Stateless Component with the following allowable Props *
 * data => JSON Array - Typically same for every Sunburst Chart *
 * scale => String - Options: linear | exponential - Linear renders each arc with same radii, Exponential reduces gradually by SquareRoot *
 * onSelect => Function - Called on Arc Click for re-rendering the chart and passing back to User as props *
 * tooltip => Boolean - Display Tooltip or not *
 * tooltipContent => HTMLNode - Customized Node for Tooltip rendering *
 * keyId => String - Unique Id for Chart SVG *
 * width => Integer - Width of the Chart Container *
 * height => Integer - Height of the Chart Container *
 */



class Sunburst extends React.Component {

    constructor(props) {
        super(props);

        const w = this.props.width
        const h = this.props.height

        this.radius = (Math.min(w, h) / 2) - 10
        this.x = d3.scaleLinear().range([0, 2 * Math.PI])
        this.y = this.props.scale === 'linear' ? d3.scaleLinear().range([0, this.radius]) : d3.scaleSqrt().range([0, this.radius])
        this.partition = d3.partition()

        this.arc = d3.arc()
            .startAngle(d => Math.max(0, Math.min(2 * Math.PI, this.x(d.x0))))
            .endAngle(d => Math.max(0, Math.min(2 * Math.PI, this.x(d.x1))))
            .innerRadius(d => Math.max(0, this.y(d.y0)))
            .outerRadius(d => Math.max(0, this.y(d.y1)))

        this.hueDXScale = d3.scaleLinear()
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

    // figures out the arc length for a node
    _arcTweenData(a, i, node) {    // eslint-disable-line
        const oi = d3.interpolate({ x0: (a.x0s ? a.x0s : 0), x1: (a.x1s ? a.x1s : 0) }, a);
        function _tween(t) {
            const b = oi(t);
            a.x0s = b.x0;     // eslint-disable-line
            a.x1s = b.x1;     // eslint-disable-line
            return this.arc(b);
        }
        var tween = _tween.bind(this)
        if (i === 0) {
            const xd = d3.interpolate(this.x.domain(), [this.node.x0, this.node.x1]);
            return function (t) {
                this.x.domain(xd(t));
                return tween(t);
            }.bind(this);
        } else {    // eslint-disable-line
            return tween;
        }
    }


    _arcTweenZoom(d) {
        const xd = d3.interpolate(this.x.domain(), [d.x0, d.x1]), // eslint-disable-line
            yd = d3.interpolate(this.y.domain(), [d.y0, 1]),
            yr = d3.interpolate(this.y.range(), [d.y0 ? 40 : 0, this.radius]);
        return function (data, i) {
            return i
                    ? () => this.arc(data)
                    : (t) => { this.x.domain(xd(t)); this.y.domain(yd(t)).range(yr(t)); return this.arc(data); };
        };
    }

    _onClick(d) {
        this.props.onSelect && this.props.onSelect(d);
        this.svg.selectAll('path').transition().duration(1000).attrTween('d', this._arcTweenZoom(d).bind(this));
    }

    _setTooltipCallbacks() {

        const tooltipContent = this.props.tooltipContent;
        this.tooltipDom = d3.select(`#${this.props.keyId}`)
            .append(tooltipContent ? tooltipContent.type : 'div')
            .style('position', 'absolute')
            .style('z-index', '10')
            .style('opacity', '0')

        if (tooltipContent) {
            Object.keys(tooltipContent.props).forEach((key) => {
                this.tooltipDom.attr(key, tooltipContent.props[key]);
            });
        }

        this.svg.on('mouseover', function (d, i, n) {
            if (!d)
                return null

                if (this.props.tooltip) {
                    d3.select(n[i]).style('cursor', 'pointer');
                    this.tooltipDom.html(() => { const name = d; return name; });
                    return this.tooltipDom.transition().duration(50).style('opacity', 1);
                }
                return null;
            }.bind(this))
            .on('mousemove', function () {
                if (this.props.tooltip) {
                    this.tooltipDom
                        .style('top', `${d3.event.pageY - 50}px`)
                        .style('left', `${this.props.tooltipPosition === 'right' ? d3.event.pageX - 100 : d3.event.pageX - 50}px`);
                }
                return null;
            }.bind(this))
            .on('mouseout', function (d, i, n) {
                if (this.props.tooltip) {
                    d3.select(n[i]).style('cursor', 'default');
                    this.tooltipDom.transition().duration(50).style('opacity', 0);
                }
                return null;
            }.bind(this));
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
                current.fill = d3.hsl(hue, 0.5, 0.6);
                return current.fill;
            }
            current.fill = current.parent.fill.brighter(0.5);
            const hsl = d3.hsl(current.fill);
            hue = this.hueDXScale(current.x0);
            const colorshift = hsl.h + (hue / 4);
            return d3.hsl(colorshift, hsl.s, hsl.l);
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', '1')
        .on('click', this._onClick.bind(this))
    }

    update() {
        this.rootData = d3.hierarchy(this.props.data);
        this.svg = d3.select('svg').append('g').attr('transform', `translate(${this.props.width / 2},${this.props.height / 2})`)
        this.firstBuild = true;
        this.node = this.rootData;
        this.rootData.sum(d => d.size);

        if (this.firstBuild) {
            this.firstBuild = false
            this._firstFill()
            this._setTooltipCallbacks()
        } else {
            this.svg.selectAll('path').data(this.partition(this.rootData).descendants());
        }
        this.svg.selectAll('path').transition().duration(1000).attrTween('d', (d, i) => this._arcTweenData(d, i));
    }

    render() {
        return (
            <div id={this.props.keyId} className="text-center">
                <svg style={{ width: parseInt(this.props.width, 10) || 480, height: parseInt(this.props.height, 10) || 400 }} id={`${this.props.keyId}-svg`} />
            </div>
        );
    }
}

export default Sunburst;
