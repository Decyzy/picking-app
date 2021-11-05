import React, {} from 'react'
import './App.css';
import { Row, Col, InputNumber, Card, Button, Space, Timeline } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

// import * as ROSLIB from './ros-web-tools/src/RosLib'

const zrender = require("zrender");
const ROSLIB = require("./ros-web-tools/src/RosLib");

class DetectionPanel extends React.Component {
  constructor(props) {
    super(props);
    this.r = React.createRef();
    this.pr = React.createRef();
  }

  draw(msg, w, h) {

  }

  componentDidMount() {
    this.zr = zrender.init(this.r.current, {
      width: 'auto',
      height: 'auto'
    });
    let circle = new zrender.Circle({
      shape: {
        cx: 150,
        cy: 50,
        r: 40
      },
      style: {
        fill: 'none',
        stroke: '#F00'
      }
    });
    circle.on("click", () => console.log("sds"))
    this.zr.add(circle);

    let that = this;
    this.listener = new ROSLIB.Topic({
      ros: ros,
      name: '/picking_detection_result',
      messageType: 'pickingv2/DetectionResult'
    });

    this.g = new zrender.Group();
    this.zr.add(this.g);
    this.listener.subscribe(function (msg) {
      console.log('Received message on ' + that.listener.name);
      const w = that.pr.current.clientWidth;
      const h = 1080 / 1920 * that.zr.getWidth();
      that.r.current.style.height = Math.round(h).toString() + 'px';
      that.r.current.style.width = w.toString() + 'px';
      that.zr.resize();
      let img = new zrender.Image({
        style: {
          image: `data:image/${msg.image.format};base64,${msg.image.data}`,
          x: 0,
          y: 0,
          width: w,
          height: h
        }
      });
      that.g.removeAll();
      that.g.add(img);
      for (let i = 0; i < msg.pixel_pts_lt.length; ++i) {
        let rc = new zrender.Rect({
          shape: {
            x: msg.pixel_pts_lt[i].x / 1920 * w,
            y: msg.pixel_pts_lt[i].y / 1080 * h,
            width: (msg.pixel_pts_rb[i].x - msg.pixel_pts_lt[i].x) / 1920 * w,
            height: (msg.pixel_pts_rb[i].y - msg.pixel_pts_lt[i].y) / 1080 * h,
            r: [3, 3, 3, 3]
          },
          style: {
            fill: 'none',
            stroke: '#F00'
          }
        });
        that.g.add(rc);
      }
      console.log(that.g.childCount());
    });
    window.addEventListener('resize', () => {
      const w = that.pr.current.clientWidth;
      const h = 1080 / 1920 * that.zr.getWidth();
      const scale = w / that.zr.getWidth();
      that.r.current.style.height = Math.round(h).toString() + 'px';
      that.r.current.style.width = w.toString() + 'px';
      that.g.eachChild(function (ch) {
        if (ch.shape) {
          ch.attr("shape", {
            x: scale * ch.shape.x,
            y: scale * ch.shape.y,
            width: scale * ch.shape.width,
            height: scale * ch.shape.height,
          })
        } else {
          ch.attr("style", {
            x: scale * ch.style.x,
            y: scale * ch.style.y,
            width: scale * ch.style.width,
            height: scale * ch.style.height,
          })
        }
      })
      that.zr.resize();
    })
  }

  render() {
    return (
      <div className="DetectionViewer" ref={this.pr}>
        <div ref={this.r}/>
        next
      </div>
    );
  }
}

class ControlPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loadingBtName: "",
      isStopBtLoading: false,
      isPauseBtLoading: false,
      isCarMoveBtLoadingName: "",
    };
    this.onCmdBtClicked = this.onCmdBtClicked.bind(this);
    this.onStopBtClicked = this.onStopBtClicked.bind(this);
    this.onPauseBtClicked = this.onPauseBtClicked.bind(this);
    this.onCarMoveBtClicked = this.onCarMoveBtClicked.bind(this);
    this.carMoveDistance = 1.0;
  }

  componentDidMount() {
    this.cmdService = new ROSLIB.Service({
      ros: ros,
      name: '/picking/cmd',
      serviceType: 'pickingv2/PickingCmd'
    });
    this.controlSrv = new ROSLIB.Service({
      ros: ros,
      name: '/picking/control',
      serviceType: 'pickingv2/PickingControl'
    });
    this.carMoveSrv = new ROSLIB.Service({
      ros: ros,
      name: '/picking/car_move',
      serviceType: 'pickingv2/CarMove'
    })
  }

  onCmdBtClicked(cmd_name) {
    console.log("onCmdBtClicked");
    this.setState({
      loadingBtName: cmd_name,
      isTaskRunning: true
    })
    let req = new ROSLIB.ServiceRequest({
      cmd: cmd_name,
    });
    let that = this;
    this.cmdService.callService(req, function (result) {
      console.log(result);
      that.setState({
        loadingBtName: "",
        isTaskRunning: false
      })
    });
  }

  onStopBtClicked() {
    console.log("onStopBtClicked");
    let req = new ROSLIB.ServiceRequest({
      cmd: "stop",
    });
    let that = this;
    this.controlSrv.callService(req, function (result) {
      console.log(result);
      that.setState({
        isStopBtLoading: false
      })
    });
    this.setState({
      isStopBtLoading: true
    })
  }

  onPauseBtClicked() {
    console.log("onPauseBtClicked");
    let req = new ROSLIB.ServiceRequest({
      cmd: "pause",
    });
    let that = this;
    this.controlSrv.callService(req, function (result) {
      console.log(result);
      that.setState({
        isPauseBtLoading: false
      })
    });
    this.setState({
      isPauseBtLoading: true
    })
  }

  onCarMoveBtClicked(cmd) {
    console.log("onCarMoveBtClicked");
    let req = new ROSLIB.ServiceRequest({
      cmd: cmd,
      distance: this.carMoveDistance,
    });
    let that = this;
    this.carMoveSrv.callService(req, function (result) {
      console.log(result);
      that.setState({
        isCarMoveBtLoadingName: ""
      })
    });
    this.setState({
      isCarMoveBtLoadingName: cmd
    })
  }

  componentWillUnmount() {
    // this.goal.cancel();
    // this.ac.dispose();
  }

  render() {
    return (
      <Card title="控制面板" style={{width: '100%'}} size="small">
        <Space direction="vertical" size="middle">
          <Row gutter={8} justify="space-between" style={{width: 200}}>
            <Col span={14}>
              <Button block
                      onClick={() => this.onCmdBtClicked("go_home")}
                      loading={this.state.loadingBtName === "go_home"}
                      disabled={this.state.loadingBtName !== "" && this.state.loadingBtName !== "go_home"}
              >归位</Button>
            </Col>
            <Col span={10}>
              <Button block
                      danger
                      type="primary"
                      onClick={this.onStopBtClicked}
                      loading={this.state.isStopBtLoading}
              >停止</Button>
            </Col>
          </Row>
          <Row gutter={8} justify="space-between">
            <Col span={14}>
              <Button block
                      onClick={() => this.onCmdBtClicked("auto")}
                      loading={this.state.loadingBtName === "auto"}
                      disabled={this.state.loadingBtName !== "" && this.state.loadingBtName !== "auto"}
              >自动运行</Button>
            </Col>
            <Col span={10}>
              <Button block
                      type="primary"
                      onClick={this.onPauseBtClicked}
                      loading={this.state.isPauseBtLoading}
              >暂停</Button>
            </Col>
          </Row>
          <Row gutter={8} justify="space-between">
            <Col span={8}>
              <Button block icon={<ArrowUpOutlined/>}
                      onClick={() => this.onCarMoveBtClicked("forward")}
                      loading={this.state.isCarMoveBtLoadingName === "forward"}
                      disabled={this.state.isCarMoveBtLoadingName !== "" && this.state.isCarMoveBtLoadingName !== "forward"}

              />
            </Col>
            <Col span={8}>
              <InputNumber min={0} max={10} defaultValue={1.0} step={1.0} style={{width: 60}}
                           onChange={(e) => {
                             this.carMoveDistance = e
                           }}
              />
            </Col>
            <Col span={8}>
              <Button block icon={<ArrowDownOutlined/>}
                      onClick={() => this.onCarMoveBtClicked("backward")}
                      loading={this.state.isCarMoveBtLoadingName === "backward"}
                      disabled={this.state.isCarMoveBtLoadingName !== "" && this.state.isCarMoveBtLoadingName !== "backward"}
              />
            </Col>
          </Row>
          {/*<Row>*/}
          {/*  <Button block*/}
          {/*          danger*/}
          {/*          type="primary"*/}
          {/*          onClick={() => this.onCarMoveBtClicked("stop")}*/}
          {/*  >停止移动</Button>*/}
          {/*</Row>*/}
        </Space>
      </Card>
    );
  }
}

class TaskStatusPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      processName: "",
      processStatus: "",
      processId: 0,
      taskInfo: [],
      msg: "",
      isRunning: false,
    };
  }

  componentDidMount() {
    // const that = this;
    // socket.on("task-status", (data) => {
    //   console.log("receive task-status");
    //   console.log(data);
    //   that.setState({
    //     processName: data.processName,
    //     processStatus: data.processStatus,
    //     taskInfo: data.taskInfo,
    //     processId: data.processId,
    //     msg: data.msg,
    //   })
    // });
  }

  render() {
    let timeline = <div>No Running Task</div>
    if (this.state.taskInfo.length > 0) {
      let curIdx = this.state.taskInfo.length;
      timeline = this.state.taskInfo.map((data, idx) => {
        let color = "green";
        if (idx > curIdx) {
          color = "gray";
        }
        let txt = data;
        if (this.state.processId === idx) {
          curIdx = idx;
          txt = this.state.processName;
          if (this.state.processStatus === "running") {
            color = "blue";
          } else if (this.state.processStatus === "error") {
            color = "red";
          } else {
            color = "green";
          }
        }
        return <Timeline.Item key={idx.toString()} color={color}>
          {txt}
        </Timeline.Item>
      });
    }
    return (
      <Card title="系统状态" style={{flex: 1}} size="small">
        <Timeline>
          {timeline}
        </Timeline>
      </Card>
    );
  }
}

const ros = new ROSLIB.Ros()

class App extends React.Component {

  // constructor(props) {
  //   super(props);
  // }

  componentDidMount() {
    ros.connect("ws://10.161.237.102:9090");
    ros.on('connection', function () {
      console.log('Connected to websocket server.');
    });

    ros.on('error', function (error) {
      console.log('Error connecting to websocket server: ', error);
    });

    ros.on('close', function () {
      console.log('Connection to websocket server closed.');
    });
  }

  componentWillUnmount() {
    ros.close();
  }

  render() {
    return (
      <div className="App">
        <Row style={{height: '100%'}} gutter={8} wrap={false}>
          <Col flex="auto" style={{display: 'flex', flexDirection: 'column'}}>
            <div style={{height: 120, backgroundColor: 'white'}}>URDF viewer</div>
            <div style={{height: 8}}/>
            {/*<DetectionViewer/>*/}
            <DetectionPanel/>
          </Col>
          <Col flex="200px" style={{display: 'flex', flexDirection: 'column'}}>
            <ControlPanel/>
            <div style={{height: 8}}/>
            <TaskStatusPanel/>
          </Col>
        </Row>
      </div>
    );
  }
}

export default App;
