import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Map from "../components/Map";
import { addDataToMap, removeDataset } from 'kepler.gl/actions';
import data from '../siteOutputGeoJson.json';
import { processGeojson, processRowObject } from "kepler.gl/dist/processors";
import siteData from "../sitesGeoJson.json"
import transferData from "../transfersGeoJson.json"
import { Button,Col,Row, Container, Accordian ,Spinner, Collapse, Card, CardBody, Dropdown, DropdownToggle, DropdownItem, DropdownMenu, ButtonGroup, UncontrolledPopover, PopoverHeader, PopoverBody } from 'reactstrap';
import DatePicker from "react-datepicker";  
import "react-datepicker/dist/react-datepicker.css"; 
import { keplerGlReducer, keplerGlReducerCore } from "kepler.gl/dist/reducers";

const axios = require('axios').default;
axios.defaults.baseURL = "localhost"
// import combinedData from "../modifiedgeoJson.json"





function getSites() {
    return axios.get("http://localhost:3001/sites");
}


function getTransfers(startDate, endDate, dataMode, aggregateMode) {
    return axios.get('http://localhost:3001/records', { //need to address bug where it crashes if fed reverse time, IE first later than second
        params: {
            startDate: startDate, //'01-01-2020',
            endDate: endDate, //"03-23-2022"
            dataMode: dataMode,
            aggregateMode: aggregateMode
        }
      })
}













































function New() {
    
    let sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate()-5);     //default start date for querry will be today, end date will be 7 days ago, so default search behaviour is to show the last week of activity

    const [startDate, setStartDate] = useState(sevenDaysAgo);
    const [endDate, setEndDate] = useState(new Date);
    const [closePopover, setClosePopover] = useState(true);
    const [dataMode, setDataMode] = useState("successes");
    const [arregateMode, setAggregateMode] = useState(true);

    console.log("dates: ", startDate, endDate)

    const dispatch = useDispatch();
    let objectCache = false;

    const mapConfig = {
        uiState: {
            currentModal: null
        },
        visState: {

        }
    };






    const clickGetSites = () => {
        getSites().then((res) => {

            //add display name for showing on the map
            for (let i=0; i < res.data.sites.length; i++) {
                res.data.sites[i].displayName= res.data.sites[i].names[0]
            }

            console.log(res.data)
            objectCache = res.data

            dispatch(
                removeDataset('sites')
            );

            dispatch(
                addDataToMap({
                    datasets: {
                        info: {
                            label: "Dune Sites",
                            id: "sites",
                        },
                        
                        data: processRowObject( res.data.sites ),
                        // data: processGeojson ( res.data.geoJsonSites )           //shows up as polygon, we want either point or cluster format
                    },
                    options : {
                        Radius: 20
                    }
                })
            );
        });
    };




    function dateFormatConverter(passedDate) {
        const date = passedDate.toISOString().split("T")[0].replace(/-/g, "/");
        // console.log(passedDate)
        // console.log(date)
        return date;
      }





    const clickGetTransfers = (startDate, endDate) => {

        console.log("  :",startDate.setHours(0,0,0,0),endDate.setHours(0,0,0,0))

        let niceStartDate = dateFormatConverter(startDate);
        let niceEndDate = dateFormatConverter(endDate);

        getTransfers(niceStartDate, niceEndDate, dataMode, arregateMode).then((res) => {

            console.log("records/transfers:   ",res.data)
            let transfers = []
            let sitesObject = {}

            if (objectCache) {
                console.log("using cached version")
            } else {
                sitesObject = getSites()
                console.log(" downloading sites for use in transfer processing function ")
            }


            //erase old sites, since they might not have the stats and transfers attached yet
            dispatch(
                removeDataset('sites')
            );


            //re draw the sites on the map with their statistics filled in
            dispatch(
                addDataToMap({
                    datasets: {
                        info: {
                            label: "sites",
                            id: "sites",
                        },
                        
                        data: processRowObject(res.data.siteOutputWithStats),
                    }
                })
            );


            console.log("transfer geo JSON:   ", res.data.transferGeoJSON.geoJson)


            dispatch(
                addDataToMap({
                    datasets: {
                        info: {
                            label: "transfers",
                            id: "transfers",
                        },
                        
                        data: processGeojson(res.data.transferGeoJSON.geoJson),
                    }
                })
            );
        });
    };






    //this triggers the button automatically once when the page is first/re - loaded.
    useEffect(() => {
        clickGetSites();

    }, []);


    return <>

    <Container id="mainContainer" fluid="lg">

        <Row id="loadingRow">

            <Col>
                <ButtonGroup size="lg" className="mb-2">
                    <Button active={true}>View Completed Transfers</Button>
                    <Button>View Failed Transfers</Button>
                    <Button>View Network Test Results</Button>
                </ButtonGroup>
            </Col>

            <Col>
                <ButtonGroup size="lg" className="mb-2">
                        <Button>View Individual Transfers</Button>
                        <Button>View Aggregate Transfers</Button>
                    </ButtonGroup>
            </Col>

            <Col className="bg-light border">
                <Button
                    id="searchPopOver"
                    type="button"
                    onClick={() => setClosePopover(false)}
                >
                    New Search
                </Button>

                

                <UncontrolledPopover
                    placement="bottom"
                    target="searchPopOver"
                    trigger="click"
                    isOpen={!closePopover}
                >
                    <PopoverHeader>Select Dates</PopoverHeader>
                    <PopoverBody>
                        <p>start date</p>
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                        />
                        <p>end date</p>
                        <DatePicker
                            maxDate={new Date()}
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate}
                        />
                        <Button onClick={() => {
                            setClosePopover(true) 
                            clickGetTransfers(startDate, endDate)
                        } }>Go</Button>
                        <Button onClick={() => (setClosePopover(true))}>Cancel</Button>
                    </PopoverBody>

                </UncontrolledPopover>

                <Spinner></Spinner>
            </Col>

        </Row>

        <Row id="mapRow">
            <Map></Map>
        </Row>

    </Container>

    {/* <Map></Map> */}
    {/* <Button onClick={clickGetSites}>Get Just Sites</Button>
    <Button onClick={clickGetTransfers}>Get Transfers from remote</Button> */}

    </>;
}

export default New;