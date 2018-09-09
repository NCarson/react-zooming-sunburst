import React from 'react';
import { isEqual } from 'lodash/lang';
import * as d3 from 'd3';
import PropTypes from 'prop-types'

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

    _setTooltipCallbacks() {

        this.tooltipDom = d3.select(`#${this.props.domId}`)
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
                        .duration(200)		
                        .style("opacity", .9);		
                    this.tooltipDom.html((this.props.tooltipFormatter(d.data)))
                        .style("left", (d3.event.pageX) + "px")		
                        .style("top", (d3.event.pageY - 28) + "px")
                }
                this.props.onMouseover && this.props.onMouseover(d);

            }.bind(this))					
            .on("mouseout", function(d) {		
                this.props.tooltip && this.tooltipDom.transition()		
                    .duration(500)		
                    .style("opacity", 0);	
                this.props.onMouseout && this.props.onMouseout(d);
            }.bind(this));
    }

    _onClick(d) {
        this.props.onSelect && this.props.onSelect(d);
        this.svg.selectAll('path').transition().duration(1000).attrTween('d', this._arcTweenZoom(d).bind(this));
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
