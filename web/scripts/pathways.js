/*
 * XHR to get local cytoscape json file, returned as a promise
 */
var loadJSON = function(filepath) {
    return new Promise((resolve, reject) => {
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', filepath, true);
        xobj.onreadystatechange = function () {
            if (xobj.readyState == 4 && xobj.status == "200") {
                resolve(xobj.responseText);
            }
        };
        xobj.send(null);
    });
}

document.addEventListener('DOMContentLoaded', function(){
    var loading = document.getElementById('loading');

    let loadJsonPromises = [];
    // loadJsonPromises.push(loadJSON('data/elementsBrief.json'));
    loadJsonPromises.push(loadJSON('data/elementsFull.json'));
    // loadJsonPromises.push(loadJSON('data/elementsSimple.json'));
    loadJsonPromises.push(loadJSON('data/exampleStyle.json'));

    Promise.all(loadJsonPromises).then(data => {
        // Parse JSON string into cytoscape fields
        let cyElements = JSON.parse(data[0]).elements;
        // let cyStyle = JSON.parse(data[1]).style;

        //add parent attribute for compound node creation
        cyElements.nodes.forEach(element => {
            element.data.parent = null; 
        });

        var cy = window.cy = cytoscape({
            container: document.getElementById('cy'), // container to render in
            elements: cyElements
        });

        cy.ready(function() {
            //temporary to remove extraneous nodes from elementsFull.json
            cy.remove('node[name = \"<END>\"][name = \"<BEGIN>\"]');

            setUpClusterConstants().then(response => {
                return setUpCompoundNodes();
            }).then(response => {
                styleNodesByCluster();
                styleEdges();
                addQTip();
                runInitialLayout();
                cy.boxSelectionEnabled(true);
            }).catch(error => {
                console.log(error);
            });
        });

    }).catch(error => {
        console.log(error);
    });

});

function runInitialLayout() {
    let layout = getDepartmentsClusterLayout();
    layout.run();
    layout.pon('layoutready').then(() => {
        cy.fit();
    });
}

function changeLayout() {
    let selector = document.getElementById("layout-selector");
    let layoutName = selector.options[selector.selectedIndex].text;
    let layout;
    switch (layoutName) {
        case "clusters - uniform size":
            layout = runDepartmentsClusterLayout1();
        case "cise":
            layout = runCiseLayout();
            break
        case "grid":
            layout = runGridLayout();
            break
        case "circle":
            layout = runCircleLayout();
            break
        case "concentric":
            layout = runConcentricLayout();
            break
        case "cose":
            layout = runCoseLayout();
            break
        case "breadthfirst":
            layout = runBreadthfirstLayout();
            break
        case "random":
            layout = runRandomLayout();
            break
        default:
            layout = runDepartmentsClusterLayout();
    }

    layout.pon('layoutstart').then(() => {
        $loading.show();
    });
    
    layout.pon('layoutready').then(() => {
        cy.fit();
    })
}

var elesRemovedByFilter = null;
function filter() {
    let field = document.getElementById("department-name-field");
    let dept = field.value;
    nodesRemoved = cy.nodes().filter(function (ele) {
        return ele.data('department') != dept;
    });

    elesRemovedByFilter = nodesRemoved.remove();
}

function clearFilters() {
    if (elesRemovedByFilter != null) {
        elesRemovedByFilter.restore();
        elesRemovedByFilter = null;
    }
}