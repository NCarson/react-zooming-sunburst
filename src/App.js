
import React from 'react';
import ReactDOM from 'react-dom';
import { Component } from 'react';
import { Collapse, Card, CardImg, CardText, CardBody, CardTitle, CardSubtitle, Button } from 'reactstrap';


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
            Anim pariatur cliche reprehenderit,
             enim eiusmod high life accusamus terry richardson ad squid. Nihil
             anim keffiyeh helvetica, craft beer labore wes anderson cred
             nesciunt sapiente ea proident.
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

