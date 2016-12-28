/**
 * Created by jljsj on 16/1/13.
 */
import React, { createElement } from 'react';
import ReactDOM from 'react-dom';
import easingTypes from 'tween-functions';
import requestAnimationFrame from 'raf';
import EventListener from './EventDispatcher';
//引入我们的EventDispatch
import { transformArguments, currentScrollTop, windowHeight } from './util';

function noop() {
}

let scrollLinkLists = [];

//组件的使用：<ScrollLink className="list-point" to="banner" toHash={false} />
class ScrollLink extends React.Component {
  constructor() {
    super(...arguments);
    this.rafID = -1;
    //rafID默认是-1
    this.state = {
      active: false,
    };
    //active默认是false
    if (this.props.location) {
      throw new Error('ScrollLink "location" was abandoned, please use "to"');
    }
    //ScrollLink必须有location属性
  }

  componentDidMount() {
    this.dom = ReactDOM.findDOMNode(this);
    //找到DOM
    scrollLinkLists.push(this);
    //把创建的ScrollLink组件实例放在我们的数组中
    if (this.props.onAsynchronousAddEvent) {
      this.props.onAsynchronousAddEvent(this.addScrollEventListener);
    } else {
      //默认调用addScrollEventListener
      this.addScrollEventListener();
    }
  }

  componentWillUnmount() {
    scrollLinkLists = scrollLinkLists.filter(item => item !== this);
    //组件销毁的时候，首先过滤出不是当前要销毁的这个组件实例，那么就相当于当前的组件已经卸载了
    EventListener.removeEventListener(this.eventType, this.scrollEventListener);
    //移除当前组件的事件，因为实例化的时候eventType会是随机的   
    //this.eventType = `scroll.scrollAnchorEvent${date}${length}`;
    this.cancelRequestAnimationFrame();
  }

  //点击ScrollLink实例时候我们进行的回调函数
  onClick = (e) => {
    e.preventDefault();
    if (this.rafID !== -1) {
      return;
    }
    const docRect = document.documentElement.getBoundingClientRect();
    //获取窗口参数
    const elementDom = document.getElementById(this.props.to);
    //获取目标元素，to指定的DOM
    const elementRect = elementDom.getBoundingClientRect();
    //目标元素在视口中的位置
    this.scrollTop = currentScrollTop();
    //当前浏览器滚动的高度
    const toTop = Math.round(elementRect.top) - Math.round(docRect.top) - this.props.offsetTop;
    //元素在视口中的距离-浏览器已经滚动的距离-临界距离，表示元素距离
    const t = transformArguments(this.props.showHeightActive)[0];
    const toShow = t.match('%') ? this.clientHeight * parseFloat(t) / 100 : t;
    //显示的临界点
    this.toTop = this.props.toShowHeight ?
    toTop - toShow + 0.5 : toTop;
    //toShowHeight表示scroll to showHeightActive而不是toTop，如果没有指定那么就是toTop!
    this.initTime = Date.now();
    //组件添加一个initTime属性
    this.rafID = requestAnimationFrame(this.raf);
    //执行this.raf函数
    EventListener.removeAllType('scroll.scrollAnchorEvent');
    scrollLinkLists.forEach(item => {
      if (item !== this) {
        item.remActive();
      }
    });
    this.addActive();
  }

  addScrollEventListener = () => {
    const date = Date.now();
    const length = EventListener._listeners.scroll ? EventListener._listeners.scroll.length : 0;
    //判断scroll事件的个数
    this.eventType = `scroll.scrollAnchorEvent${date}${length}`;
    //添加事件，并监听滚动事件
    EventListener.addEventListener(this.eventType, this.scrollEventListener);
    // 第一次进入；等全部渲染完成后执行;
    setTimeout(() => {
      this.scrollEventListener();
    });
  }

  raf = () => {
    if (this.rafID === -1) {
      return;
    }
    //获取duration
    const duration = this.props.duration;
    const now = Date.now();
    //获取当前时间
    const progressTime = now - this.initTime > duration ? duration : now - this.initTime;
    //initTime表示onClick执行的时候的时间
    const easeValue = easingTypes[this.props.ease](progressTime, this.scrollTop,
      this.toTop, duration);
    window.scrollTo(window.scrollX, easeValue);
    //让window进行滚动到指定的位置
    if (progressTime === duration) {
      this.cancelRequestAnimationFrame();
      EventListener.reAllType('scroll.scrollAnchorEvent');
    } else {
      this.rafID = requestAnimationFrame(this.raf);
    }
  }

  //取消requestAnimationFrame执行，同时把rafID重置为-1
  cancelRequestAnimationFrame = () => {
    requestAnimationFrame.cancel(this.rafID);
    this.rafID = -1;
  }

  addActive = () => {
    if (!this.state.active) {
      const obj = {
        target: this.dom,
        to: this.props.to,
      };
      //target表示元素本身，而to表示在组件中配置的属性
      //this.dom=ReactDOM.findDOMNode(this)
      this.props.onFocus(obj);
      //是一个回调函数，两个参数分别为target和to
      this.setState({
        active: true,
      }, () => {
        //toHash表示把to放置到location.hash中
        if (this.props.toHash) {
          const link = `#${this.props.to}`;
          history.pushState(null, window.title, link);
        }
      });
    }
  };

  remActive = () => {
    if (this.state.active) {
      const obj = {
        target: this.dom,
        to: this.props.to,
      };
      this.props.onBlur(obj);
      //执行onBlur函数，同时把active设置为false
      this.setState({
        active: false,
      });
    }
  }
 //调用 EventListener.addEventListener(this.eventType, this.scrollEventListener);
  scrollEventListener = () => {
    const docRect = document.documentElement.getBoundingClientRect();
    this.clientHeight = windowHeight();
    //窗口的高度window.innerHeight/docuemnt.documentElement.clientHeight
    const elementDom = document.getElementById(this.props.to);
    //获取我们的prop，也就是to指定的ID
    if (!elementDom) {
      throw new Error(`There is no to(${this.props.to}) in the element.`);
    }
    const elementRect = elementDom.getBoundingClientRect();
    //滚动的时候，我们获取我们组件的to指定的元素在浏览器视口中的位置
    const elementClientHeight = elementDom.clientHeight;
    //我们的to元素的高度
    const scrollTop = currentScrollTop();
    //当前滚动的高度
    const top = Math.round(docRect.top - elementRect.top + scrollTop);
    //如果元素已经在顶部隐藏，这时候top为正数，表示已经滚动进去的距离；如果元素还在视口中间表示元素距离视口的距离的负数
    //所以这个值表示元素在顶部隐藏的距离
    const showHeightActive = transformArguments(this.props.showHeightActive);
    //transformArguments是把参数转化为数组
    const startShowHeight = showHeightActive[0].toString().indexOf('%') >= 0 ?
    parseFloat(showHeightActive[0]) / 100 * this.clientHeight :
      parseFloat(showHeightActive[0]);
    //这里的百分比是和window.innerHeight相关的
    const endShowHeight = showHeightActive[1].toString().indexOf('%') >= 0 ?
    parseFloat(showHeightActive[1]) / 100 * this.clientHeight :
      parseFloat(showHeightActive[1]);
    //表示元素隐藏的距离小于固定的百分数（包括真正是隐藏了以及还在可视区域），我们会让他显示
    if (top >= -startShowHeight && top < elementClientHeight - endShowHeight) {
      this.addActive();
    } else {
      this.remActive();
    }
  }

  render() {
    const active = this.state.active ? this.props.active : '';
    const onClick = this.props.onClick;
    //获取onClick句柄
    const props = {
      ...this.props,
      onClick: (e) => {
        onClick(e);
        this.onClick(e);
      },
    };
    //最后的props具有我们传入的props，同时也具有onClick函数，其触发的时候是调用我们通过props
    //传入的onClick事件句柄，同时也会调用该组件自己具有的this.onClick函数
    [
      'component',
      'duration',
      'active',
      'location',
      'showHeightActive',
      'ease',
      'toShowHeight',
      'offsetTop',
      'to',
      'onAsynchronousAddEvent',
      'toHash',
    ].forEach(key => delete props[key]);
    //把传入的这些属性全部从props中删除
    const reg = new RegExp(active, 'ig');
    //active表示在ScrollLink中配置的className
    const className = props.className || '';
    //获取props传入的className
    props.className = className.indexOf(active) === -1 ?
      `${className} ${active}`.trim() : className.replace(reg, '').trim();
    //如果props传入的className有active指定的calssName,那么去掉就可以了
    //如果传入的className没有这个active指定的className，那么我们加上就可以了
    return createElement(this.props.component, props);
    //同时创建一个新的对象，同时加上我们具有的props，注意，我们上面还有我们的onClick事件句柄
  }
}

ScrollLink.propTypes = {
  component: React.PropTypes.string,
  children: React.PropTypes.any,
  className: React.PropTypes.string,
  style: React.PropTypes.any,
  offsetTop: React.PropTypes.number,
  duration: React.PropTypes.number,
  active: React.PropTypes.string,
  location: React.PropTypes.string,
  to: React.PropTypes.string,
  showHeightActive: React.PropTypes.any,
  toShowHeight: React.PropTypes.bool,
  ease: React.PropTypes.string,
  onClick: React.PropTypes.func,
  onFocus: React.PropTypes.func,
  onBlur: React.PropTypes.func,
  onAsynchronousAddEvent: React.PropTypes.func,
  toHash: React.PropTypes.bool,
};

//设置默认的属性defaultProps
ScrollLink.defaultProps = {
  component: 'div',
  offsetTop: 0,
  duration: 450,
  active: 'active',
  showHeightActive: '50%',
  ease: 'easeInOutQuad',
  toHash: true,
  onClick: noop,
  onFocus: noop,
  onBlur: noop,
};


export default ScrollLink;
