
import React from 'react';
import ReactDOM from 'react-dom';
import { Component } from 'react';
import { Collapse, Card, CardBody,  Button } from 'reactstrap';

class App extends Component {
  constructor(props) {
    super(props);
    this.toggle = this.toggle.bind(this);
    this.state = { collapse: false };
  }

  toggle() {
    this.setState({ collapse: !this.state.collapse });
  }

  render() {
    return (
      <div>
        <Button color="primary" onClick={this.toggle} style={{ marginBottom: '1rem' }}>Toggle</Button>
        <Collapse isOpen={this.state.collapse}>
          <Card>
            <CardBody>
                Hello React, Makefile, and reactstrap!
            </CardBody>
          </Card>
        </Collapse>
      </div>
    );
  }
}

ReactDOM.render(
    <div id='hello'>
		<App />
    </div>
    , document.querySelector('#app')
);

