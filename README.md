
### Zoomable with Nicely Formatted Text

[Demo]()
<img 
    alt='screenshot' 
    src='https://raw.githubusercontent.com/NCarson/react-zooming-sunburst/master/.screen.png'
    width='400' />

```jsx
class Sunburst extends React.Component {

    static propTypes = {
        data: PropTypes.object.isRequired, // see d3 sunburst for example data shape
        // if width and height are not the same there will be dead space
        width: PropTypes.string.isRequired,
        height: PropTypes.string.isRequired,
        count_member: PropTypes.string.isRequired, // what data element to use for slice size

		// requried /w/ default
        tooltip: PropTypes.bool.isRequired,
        tooltipFunc: PropTypes.func.isRequired,
        sumFunc: PropTypes.func.isRequired, // what metric to use for slices
        radianCutoff: PropTypes.number.isRequired, // smallest slice to show in radians
        transitionDuration: PropTypes.number.isRequired, // ms for animation
        colorFunc: PropTypes.func.isRequired, // custom colorizing for slice
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
        font_size: 12,
        tooltipX: 20,
        tooltipY: 20,
        saturation: .5,
        lightness: .5,
        child_brightness: .5,
        _debug: false,
        _console: window.console,
    }
    ...
}
```

### install
```
npm install react-zoomable-sunburst
```

### development
```
cd src && make
```

