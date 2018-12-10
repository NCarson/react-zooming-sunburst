import React from 'react';
import Sunburst from './Sunburst';
import data from './data';
import ReactDOM from 'react-dom';

class App extends React.Component {
  onSelect(event){
    console.log(event);
  }
  render() {
    return (
      <div className="App">
        <Sunburst
          data={data}
          width="880"
          height="880"
          count_member="size"
          labelFunc={(node)=>node.data.name}
          _debug={true}
        />
      </div>
    );
  }
}

ReactDOM.render(
        <App/>
    , document.querySelector('#app')
);
export default App
