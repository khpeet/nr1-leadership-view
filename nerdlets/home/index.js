import React from 'react';
import { navigation, nerdlet, NerdGraphQuery, Spinner } from 'nr1';
import { Accordion, Button, Loader } from 'semantic-ui-react';
import _ from 'lodash';
import config from './config.json';

const query = require('./utils');

export default class HomeNerdlet extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeIndex: -1,
      loading: true,
      workloads: [],
      groups: null,
      groups2: null,
      refreshRate: 60000
    };

    this.parentWorkload = config.parentWorkloadGuid;
    this.groupByParentTag = config.groupByParentTag;
    this.groupByChildTag = config.groupByChildTag;
  }

  handleClick = (e, titleProps) => {
   const { index } = titleProps
   const { activeIndex } = this.state
   const newIndex = activeIndex === index ? -1 : index

   this.setState({ activeIndex: newIndex })
  }


  async componentDidMount() {
    const { refreshRate } = this.state;

    nerdlet.setConfig({
      header: false,
      timePicker: false
    });
    await this.getData(null);
    this.interval = setInterval(() => this.getData(null), refreshRate);
    await this.setState({ loading: false });
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  async getData(c) {
    let all = [];

    const result = await NerdGraphQuery.query({
      query: query.workloadStatus(c, this.parentWorkload)
    });

    if (result.errors) {
      console.debug(`Failed to fetch workload status`);
      console.debug(result.errors);
    } else {
      let workloads = result.data.actor.entity.relatedEntities.results;
      let nextCursor = result.data.actor.entity.relatedEntities.nextCursor;

      if (nextCursor == null) {
        all = all.concat(workloads);
      } else {
        all = all.concat(workloads);
        return this.getData(nextCursor);
      }

      let final = await this.formatData(all);
      //let sortedFinal = _.sortBy(final, ['index']);

      this.setState({workloads: all, groups: final});
    }
  }

  //example function for sorting based on specific group values
  fetchGroupOrder(group) {
    switch (group) {
      case 'FrontOffice':
        return 0;
        break;
      case 'ServiceIntegrationOrchestration':
        return 1;
        break;
      case 'BackOffice':
        return 20;
        break;
      case 'Infrastructure':
        return 22;
        break;
      default:
        return 21;
        break;
    }
  }

  async formatData(data) {
    let group = {};
    let groupArray = [];

    data.forEach(w => {
      const groupTag = w.target.entity.tags.find(tag => tag.key === this.groupByParentTag)?.values[0];
      const childGroupTag = w.target.entity.tags.find(tag => tag.key === this.groupByChildTag)?.values[0];

      if (groupTag && childGroupTag) {
        if (!group[groupTag]) {
          group[groupTag] = {};
        }
        if (!group[groupTag][childGroupTag]) {
          group[groupTag][childGroupTag] = [];
        }
        group[groupTag][childGroupTag].push(w);
      }
    })

    const result = [];

    Object.entries(group).forEach(([groupTag, childGroups]) => {
      const children = [];
      Object.entries(childGroups).forEach(([childGroupTag, objects]) => {
        children.push({
          childGroupTag,
          index: this.fetchGroupOrder(childGroupTag),
          data: _.sortBy(objects, [obj => obj.target.entity.name.toLowerCase()])
        });
      });

      result.push({
        groupTag,
        childGroups: children
      });
    });

    return result;
  }

  getColor(status) {
    switch(status) {
      case 'CRITICAL':
        return 'red';
        break;
      case 'NOT_ALERTING':
        return 'green';
        break;
      case 'WARNING':
        return 'yellow';
        break;
      case 'NOT_CONFIGURED':
        return 'grey';
        break;
      default:
        return 'green';
        break;
    }
  }

  renderCards() {
    let { activeIndex, workloads, groups } = this.state;

    return (
      <div class="row">
        {groups.map((g, i) => {
          return (
            <div class="column">
              <h2>{g.groupTag}</h2>
              {g.childGroups.map((cg, i) => {
                let formattedGroupName = cg.childGroupTag.replace(/([a-z])([A-Z])/g, '$1 $2');
                return (
                  <Accordion fluid styled>
                    <Accordion.Title
                      active={activeIndex}
                      index={i}
                    >
                    <h3>{formattedGroupName}</h3>
                    </Accordion.Title>
                    <Accordion.Content active={activeIndex}>
                      {cg.data.map(wl => {
                        return (
                          <Button onClick={() => navigation.openStackedEntity(wl.target.entity.guid)} size='big' style={{'marginBottom': '5px'}} color={this.getColor(wl.target.entity.alertSeverity)}>{wl.target.entity.name}</Button>
                        )
                      })}
                    </Accordion.Content>
                  </Accordion>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  render() {
    const { loading, workloads } = this.state

    if (loading && workloads.length == 0) {
      return (
        <div style={{ textAlign: 'center' }}>
          <h4>Loading</h4>
          <Spinner type={Spinner.TYPE.DOT} />
        </div>
      )
    } else {
      return (
        <>
          {workloads.length > 0 ? this.renderCards() : 'No workloads found'}
        </>
      )
    }
  }
}
