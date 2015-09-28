const Reveal = window.Reveal;
const d3 = require('d3');
const R = require('ramda');
const React = require('react');

function withFreshSVG(f) {
  var saved = null;
  return (slide) => {
    if (saved === null) {
      saved = slide.querySelector('svg').cloneNode(true);
    }
    var newSvg = saved.cloneNode(true);
    slide.replaceChild(newSvg, slide.querySelector('svg'));
    return f(slide);
  };
}

function toSVGPoint(svg, elem, x, y) {
  var pt = svg.createSVGPoint();
  pt.x = 0|x;
  pt.y = 0|y;
  if (typeof elem === 'string') {
    elem = svg.querySelector(elem);
  }
  return pt.matrixTransform(elem.getTransformToElement(svg));
}

function distributedDiagramSlide(slide) {
  var svg = slide.querySelector('svg');
  var t0 = d3.select(svg);
  var msgs = t0.insert('g').classed('messages', true);
  function animStyle(selection, selector, name, val) {
    selection.selectAll(selector).style(name, val);
  }
  var didConnect = false;
  function getT1() {
    if (!didConnect) {
      didConnect = true;
      return t0.transition().duration(1000).call(animStyle, '.phase1', 'opacity', 1)
        .transition().call(animStyle, '.phase1', 'stroke-dasharray', '1,0')
        .transition().call(animStyle, '.phase1', 'stroke-dasharray', '15,5')
        .transition().call(animStyle, '.phase1', 'opacity', 0)
        .transition().call(animStyle, '.phase2', 'opacity', 1);
    }
    return t0;
  }
  var msgPath = [toSVGPoint(svg, 'g[data-name=PidA]', 0, 115),
                 toSVGPoint(svg, 'g[data-name=net_kernelA]', 115, 0),
                 toSVGPoint(svg, 'g[data-name=net_kernelB]', -115, 0),
                 toSVGPoint(svg, 'g[data-name=PidB]', 0, 115)];
  var msgPathBack = msgPath.slice().reverse();
  var msgId = 0;
  svg.addEventListener('click', function () {
    var id = 'msg-' + ++msgId;
    var msgsel = 'circle[data-msgid=' + id + ']';
    var msg = msgs.insert('circle')
      .attr('r', 30)
      .attr('data-msgid', id)
      .attr('cx', msgPath[0].x)
      .attr('cy', msgPath[0].y)
      .style('opacity', 0);
    var t1 = getT1().transition().duration(1000).selectAll(msgsel).style('opacity', 1);
    var t2 = msgPath.reduce(
      (acc, pt) => acc.transition().attr('cx', pt.x).attr('cy', pt.y),
      t1).transition().style('opacity', 0)
         .transition().style('opacity', 1)
         .each('start', () => this.classList.add('response'));
    var t3 = msgPathBack.reduce(
      (acc, pt) => acc.transition().attr('cx', pt.x).attr('cy', pt.y),
      t2).transition().style('opacity', 0).remove();
  });
}

function supervisorSlide(slide) {
  var svg = slide.querySelector('svg');
  var nodes = R.reduce(
    (acc, n) => {
      var name = n.getAttribute('data-name');
      acc[name] = {elem: n, name: name, parent: null, children: [], links: [],
                   paths: ['g[data-name="' + name+ '"]'],
                   alive: true,
                   supervisor: n.classList.contains('supervisor')};
      return acc;
    },
    {},
    svg.querySelectorAll('g[data-name]'));
  R.forEach(
    (n) => {
      var names = n.getAttribute('data-link').split(/\s+/),
          parent = nodes[names[0]],
          child = nodes[names[1]],
          linkPath = 'line[data-link="' + n.getAttribute('data-link') + '"]';
      parent.children.push(child);
      parent.links.push(n);
      child.paths.push(linkPath);
      child.parent = parent;
    },
    svg.querySelectorAll('line[data-link]'));
  function setProcessState(name, alive, t0) {
    var node = nodes[name];
    if (node.alive === alive) {
      return t0;
    }
    node.alive = alive;
    var t1 = (t0 || d3).transition();
    t1.duration(750).selectAll(node.paths.join(',')).style('opacity', +alive);
    node.children.forEach(function (child) {
      setProcessState(child.name, alive, t1);
    });
    if (!alive && node.parent !== null) {
      if (node.parent.supervisor && node.parent.alive) {
        setProcessState(node.name, true, t1.transition());
      } else {
        setProcessState(node.parent.name, false, t1);
      }
    }
    return t1;
  }
  svg.addEventListener('click', function (event) {
    var t = event.target;
    while (t && t !== event.currentTarget && t.getAttribute('data-name') === null) {
      t = t.parentNode;
    }
    var name = t.getAttribute('data-name');
    if (name !== null) {
      setProcessState(name, false, null);
    }
  });
}

const Counter = React.createClass({
  getInitialState() {
    return {count: 0};
  },
  handleClick(e) {
    e.preventDefault();
    this.setState({count: this.state.count + 1});
  },
  render() {
    return (
      <div onClick={this.handleClick}>
        Updated {this.state.count} times.
      </div>);
  }
});

function renderCounterExample(slide) {
  var div = slide.querySelector('#counter-example-div');
  React.unmountComponentAtNode(div);
  React.render(<Counter/>, div);
}

window.addEventListener('DOMContentLoaded', () => {
  var funs = {
    supervisor: withFreshSVG(supervisorSlide),
    'distributed-diagram': withFreshSVG(distributedDiagramSlide),
    'minimal-example': renderCounterExample,
  };
  function slideEvent(event) {
    (funs[event.currentSlide.id] || function(){})(event.currentSlide);
  }
  Reveal.addEventListener('slidechanged', slideEvent);
  Reveal.addEventListener('ready', slideEvent);
  if (Reveal.isReady()) {
    slideEvent({currentSlide: Reveal.getCurrentSlide()});
  }
});
