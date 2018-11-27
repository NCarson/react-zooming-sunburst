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
import { transition as d3Transition } from 'd3-transition' //eslint-disable-line no-unused-vars

//TODO switch from lodash to shallow equal
/*
 * zoomable /w/ labels -- https://bl.ocks.org/vasturiano/12da9071095fbd4df434e60d52d2d58d
 * text opacity -- https://gist.github.com/metmajer/5480307
*/

class Sunburst extends React.Component {

    static propTypes = {
        data: PropTypes.object.isRequired, // see d3 sunburst for example data shape
        // if width and height are not the same there will be dead space
        width: PropTypes.string.isRequired,
        height: PropTypes.string.isRequired,

		// requried /w/ default
        tooltip: PropTypes.bool.isRequired,
        tooltipFunc: PropTypes.func.isRequired,
        sumFunc: PropTypes.func.isRequired, // what metric to use for slices
        radianCutoff: PropTypes.number.isRequired, // smallest slice to show in radians
        transitionDuration: PropTypes.number.isRequired, // ms for animation
        colorFunc: PropTypes.func.isRequired, // custom colorizing for slice
        count_member: PropTypes.string.isRequired, // what data element to use for slice size
        tooltipX: PropTypes.number.isRequired, // offset x to place tooltip
        tooltipY: PropTypes.number.isRequired, // ofset y to place tooltip
        saturation: PropTypes.number.isRequired, // base saturation of arcs
        lightness: PropTypes.number.isRequired, // base lightness of parent arcs
        child_brightness: PropTypes.number.isRequired, // value to lighten children
        font_size: PropTypes.number.isRequired, // for calculating if text fits

        domId: PropTypes.string, // will be random if undefined
        onMouseover: PropTypes.func,
        onMouseout: PropTypes.func,
        onClick: PropTypes.func,
        labelFunc: PropTypes.func,   // returns text for slice
        condensedLabelFunc: PropTypes.func, // backup function to try to fit text
        key_member: PropTypes.string, // unique id
        _debug : PropTypes.bool,
        _console : PropTypes.object,
    }

    static defaultProps = {
        tooltip: true,
        tooltipFunc: (data) => data.name,
        sumFunc: (data) => data.size,
        radianCutoff: .001,
        transitionDuration: 500,
        colorFunc: (node, current_color) => current_color,
        key_member: 'key',
        count_member: 'count',
        font_size: 12,
        tooltipX: 20,
        tooltipY: 20,
        saturation: .5,
        lightness: .5,
        child_brightness: .5,
        _debug: false,
        _console: window.console,
    }

    constructor(props) {
        super(props);

        this._last_click = null
        this.radius = (Math.min(this.props.width, this.props.height) / 2);
        this.y = scaleSqrt()
            .range([0, this.radius]);

        this.x= scaleLinear()
            .range([0, 2 * Math.PI])

        this.arc = d3Arc()
                .startAngle((d) => { return Math.max(0, Math.min(2 * Math.PI, this.x(d.x0))); })
                .endAngle((d) => { return Math.max(0, Math.min(2 * Math.PI, this.x(d.x1))); })
                .innerRadius((d) => { return Math.max(0, this.y(d.y0)); })
                .outerRadius((d) => { return Math.max(0, this.y(d.y1)); });

        this.partition = d3Partition()

        this.hueDXScale = scaleLinear()
            .domain([0, 1])
            .range([0, 360])

        this.domId = this.props.domId || ('sunburst-wrapper-' + Math.round(Math.random() * 1e12).toString())
        this.svg = null
        this.tooltipDom = null
        this.lastSelect = null
    }

    componentDidMount() {
        this.props._debug && this.props._console.log("Sunburst: componentDidMount()")
        this._create();
    }

    shouldComponentUpdate(nextProps) {
        this.props._debug && this.props._console.log("Sunburst: shouldComponentUpdate()", this.props)
        if (!isEqual(this.props, nextProps)) {
            return false
        }
        return true
    }

    _destroy_svg() {
		this.svg && this.svg.selectAll('*').remove()
        this.svg = null
    }

    componentDidUpdate() { //prevProps
        this.props._debug && this.props._console.log("Sunburst: componentDidUpdate()")
        this._destroy_svg()
        this._create()
    }

    componentWillUnmount() {
        this.props._debug && this.props._console.log("Sunburst: componentWillUnmount()")
        this._destroy_svg()
    }

    select(id) {
        const key = '#mainArc-' + id
        const nodes = d3Select(key).nodes()
        if (!nodes.length) {
            console.warn(`could not find node with id of ${key}`)
            return
        }
        const node = nodes[0].__data__
        this._update(node)
    }

    _onClick(node) {
        this._last_click = node
    }

    updateColor()  {
        this.svg.selectAll('path.sunburst-main-arc')
            .style("fill", (d) => d.parent ? this._colorize(d) : "white")
    }

    _create() {
        this.props._debug && this.props._console.log("Sunburst: update()")
        if (!this.props.data) return;

        const root = d3Hierarchy(this.props.data)
            .sum(function(d) { 
                return !d.children || d.children.length === 0 ? d[this.props.count_member] :0; 
            }.bind(this))
        //.filter( (d) => d.depth < 4)

        const data = this.partition(root)
            .descendants()
            .filter( (d) => d.x1 - d.x0 > this.props.radianCutoff) // 0.005 radians = 0.29 degrees

        if (!this.svg) {
            const w = this.props.width
            const h = this.props.height
            const el = d3Select('#' + this.domId)

            this.svg = el.append('svg');
            this.svg
              .style('class', 'sunburst-svg')
              .style('width', w + 'px')
              .style('height', h + 'px')
              .attr('viewBox', `${-w/2} ${-h/2} ${w} ${h}`);
            //this.canvas = this.svg.append('g');
            this.svg = d3Select("svg").append("g").attr("id", "bigG")

            var gSlices = this.svg.selectAll("g")
                .data(data)
                .enter()
                .append("g")

            gSlices.exit().remove();

            const key = this.props.key_member
            gSlices.append("path")
                .attr('class', (d) => {
                    const cursor = (!d.parent || !d.children) ? ' cursor-pointer' : ' cursor-pointer'
                    const evenodd = d.depth%2 ? 'even-row' :  'odd-row'
                    console.log(d)
                    return `sunburst-main-arc${cursor} ${evenodd}`
                }).attr('id', (d, i) => { 
                    return key ? `mainArc-${d.data[key]}` : `mainArc-${i}`
                }).style("fill", (d) => d.parent ? this._colorize(d) : "white")
                .on('click', function(node) {
                    this._onClick(node)
                    this.props.onClick && this.props.onClick(node);
                    this._update(node)
                }.bind(this))

            if (this.props.labelFunc) {
                gSlices.append('path')
                    .attr('class', 'sunburst-hidden-arc')
                    .attr('id', (_, i) => `hiddenArc${i}`)
                    .attr('d', this._middleArcLine.bind(this))
                    .style('fill', 'none')

                const text = gSlices.append('text')
                    .style('pointer-events', 'none')
                    .style('dominant-baseline', 'middle')
                    .style('text-anchor', 'middle')
                    //.attr('display', d => this._textFits(d) ? null : 'none')

                text.append('textPath')
                    .attr('startOffset','50%')
                    .attr('xlink:href', (_, i) => `#hiddenArc${i}` )
                    .text(d => this._getLabelText(d) || '')
            }
        }
        this.props.tooltip && this._setTooltips()
        this._update(root)
    }

    _update(d, i, a) {

        if (this.lastSelect && a && this.lastSelect == a[i].id)
            return

        this.lastSelect = a && a[i].id

        this.svg.transition().selectAll('textPath').attr("opacity", 0);

        const transition = this.svg.transition()
		  .duration(this.props.transitionDuration) // duration of transition
		  .tween("scale", function() {
				var xd = d3Interpolate(this.x.domain(), [d.x0 , d.x1]),
				yd = d3Interpolate(this.y.domain(), [d.y0 , 1]),
				yr = d3Interpolate(this.y.range(), [(d.y0 ? (20) : 0) , this.radius]);
				return function(t) { this.x.domain(xd(t)); this.y.domain(yd(t)).range(yr(t)); }.bind(this);
		    }.bind(this))

        transition.selectAll('path.sunburst-hidden-arc')
            .attrTween('d', d => () => this._middleArcLine(d));

        //.style("fill", (d) => d.parent ? this._colorize(d) : "white")
        transition.selectAll('path.sunburst-main-arc')
            .attrTween('d', d => () => { 
                const arc = this.arc(d)
                return arc
            }).on("end", (e, i, a) => {
                if (!this.arc.innerRadius()(e)) // if its not visible
                    return
                // get a selection of the associated text element
                var arcText = d3Select(a[i].parentNode).select("text textPath");
                // fade in the text element and recalculate positions
                arcText.transition(this.props.transitionDuration / 2)
                    .attr("opacity", 1)
                    .text((d) => {
                        const text = this._getLabelText(d)
                        return text
                    })
      		});
    }

    _textFits(d, label) {

        if (!label)
            return false
        // changed to degress
        const angle = (this.arc.endAngle()(d) - this.arc.startAngle()(d))  * 57.296
        const radius = this.arc.outerRadius()(d)
        const arclength =  2*Math.PI*radius*(angle / 360)
        return label.length * this.props.font_size < arclength;
    }

    _getLabelText(d) {
        var label
        label = this.props.labelFunc && this.props.labelFunc(d)
        if (this._textFits(d, label))
            return label
        label = this.props.condensedLabelFunc && this.props.condensedLabelFunc(d)
        if (this._textFits(d, label))
            return label
        return null
    }

    _middleArcLine(d) {
        const halfPi = Math.PI/2;
        const angles = [this.x(d.x0) - halfPi, this.x(d.x1) - halfPi];
        const r = Math.max(0, (this.y(d.y0) + this.y(d.y1)) / 2);

        const middleAngle = (angles[1] + angles[0]) / 2;
        const invertDirection = middleAngle > 0 && middleAngle < Math.PI; // On lower quadrants write text ccw
        if (invertDirection) { angles.reverse(); }

        const path = d3Path();
        path.arc(0, 0, r, angles[0], angles[1], invertDirection);
        return path.toString();
    }

    _inDomain(d) {
        const d0 = this.x.domain()[0]
        const d1 = this.x.domain()[1]
        if (d.x0 < d0)
            return false
        if (d.x1 > d1)
            return false
        return true
    }



    _setTooltips() {

        this.tooltipDom = d3Select(`#${this.domId}`)
            .append('div')
			.attr('class', 'sunburst-tooltip')
            .style('position', 'absolute')
            .style('z-index', '10')
            .style('opacity', '0')
            .style('text-align', 'center')
            .style('border-radius', '8px')
        //.style('max-width', '20em')
            .style('pointer-events', 'none')
            .style('background', 'lightsteelblue')
            .style('padding', '3px')

        const dx = this.props.tooltipX
        const dy = this.props.tooltipY
        this.svg.selectAll('path.sunburst-main-arc')
            .on("mouseover", function(d) {		
                if (this.props.tooltip) {
                        this.tooltipDom.html(this.props.tooltipFunc(d.data))
                            .style("left", (d3Event.pageX+dx) + "px")		
                            .style("top", (d3Event.pageY+dy) + "px")
                        this.tooltipDom.transition()
                            .style("opacity", .9)
                            .duration(200)

                this.props.onMouseover && this.props.onMouseover(d.data);
                }
            }.bind(this))					
            .on("mouseout", function(d) {
                this.props.tooltip && this.tooltipDom.transition()		
                    .style("opacity", 0)
                    .duration(500)

                this.props.onMouseout && this.props.onMouseout(d.data);
            }.bind(this))
    }

    _colorize(d) {
        let hue;
        const current = d;
        if (current.depth === 0) {
            return '#33cccc';
        }
        const {lightness, saturation, child_brightness} = this.props
        if (current.depth <= 1) {
            hue = this.hueDXScale(d.x0);
            current.fill = hsl(hue, saturation, lightness);
            return current.fill;
        }
        current.fill = current.parent.fill.brighter(child_brightness);
        const thishsl = hsl(current.fill);
        hue = this.hueDXScale(current.x0);
        const colorshift = thishsl.h + (hue / 4);
        const c = hsl(colorshift, thishsl.s, thishsl.l)
        return this.props.colorFunc(d, c)
    }

    // we have to render first then componentMounted will give us
    // access to the dom
    render() {
        this.props._debug && this.props._console.log("Sunburst: render()")
        return (
            <div className='sunburst-wrapper' id={this.domId} />
        );
    }
}

export default Sunburst;
