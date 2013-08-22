// model specification
// -------------------
var Model = function() {
    return {
        tw: [],     // array of d3.map()s
        dt: [],     // docs in rows, topic counts in columns
        alpha: [],  // alpha value for topics
        uris: [],   // document uris
        cites: [],  // document citations
        n: 0,
        n_top_words: 0
    };
}


// utility functions
// -----------------

var top_words = function(m,t,n) {
    w = m.tw[t].keys().sort(function(j,k) {
        return d3.descending(m.tw[t].get(j),m.tw[t].get(k));
    });

    return w.slice(0,n);
};

var topic_label = function(m,t,n) {
    var label;
    
    label = d3.format("03d")(t + 1); // user-facing index is 1-based
    label += " ";
    label += top_words(m,t,VIS.overview_words).join(" ");
    return label;
};

var word_topics = function(m,word) {
    var result,score;

    result = [];
    for(t = 0;t < m.n;t++) {
        row = m.tw[t]
        if(row.has(word)) {
            rank = 0;
            word_wt = row.get(word);

            row.forEach(function(w,wt) {
                if(wt > word_wt) {
                    rank++;
                }
            });

            // zero-based rank = (# of words strictly greater than word)
            result.push([t,rank]);
        }
    }
    return result;
};

var top_docs = function(m,t,n) {
    var docs,wts,wt,insert;

    // naive document ranking: just by the proportion of words assigned to t 
    // which does *not* necessarily give the docs where t is most salient

    var weight = function (d) {
        return m.dt[d][t] / m.doc_len[d];
    };
    // initial guess
    docs = d3.range(n);
    wts = docs.map(weight);
    docs.sort(function (a,b) {
        return d3.ascending(wts[a],wts[b]);
    });
    wts = docs.map(function (d) { return wts[d]; });

    for(i = n;i < m.dt.length;i++) {
        wt = weight(i);
        insert = d3.bisectLeft(wts,wt);
        if(insert > 0) {
            docs.splice(insert,0,i);
            docs.shift();
            wts.splice(insert,0,wt);
            wts.shift();
        }
    }

    return docs.reverse(); // biggest first
};



// Principal view-generating functions
// -----------------------------------

var topic_view = function(m,t) {
    var view, as, docs;

    console.log("View for topic " + (t + 1));

    hide_views();

    view = d3.select("div#topic_view");

    // get top words and weights
    // -------------------------

    view.select("h2")
        .text(topic_label(m,t,VIS.overview_words));

    view.select("p#topic_remark")
        .text("α = " + VIS.float_format(m.alpha[t]));


    as = view.select("div#topic_words")
        .selectAll("a")
        .data(top_words(m,t,m.n_top_words));

    as.enter()
        .append("a");

    as.exit().remove();

    as
        .attr({ href: "#" })
        .text(function (w) {
                return m.tw[t].get(w) + " " + w;
        }) 
        .on("click",function (w) {
            word_view(m,w);
        });


    // get top articles
    // ----------------

    docs = top_docs(m,t,VIS.topic_view_docs);

    // TODO TEST
    as = view.select("div#topic_docs")
        .selectAll("a")
        .data(docs);

    as.enter()
        .append("a");

    as.exit().remove();

    as
        .attr({ href: "#" })
        .html(function (d) {
            var weight,frac;

            weight = m.dt[d][t]; 
            frac = weight / m.doc_len[d];
            return weight.toString() + " ("
                + VIS.float_format(frac) + ") "
                + m.cites[d];
        })
        .on("click",function (d) {
            doc_view(m,d);
        })


    // ready
    view.classed("hidden",false);

    // (later: time graph)
    // (later: nearby topics by J-S div or cor on log probs)
    //
};

var word_view = function(m,word) {
    var view, as, topics;

    console.log("View for word " + word);

    hide_views();

    view = d3.select("div#word_view");

    view.select("h2")
        .text(word);

    topics = word_topics(m,word);
    topics = topics.sort(function(a,b) {
        return d3.ascending(a[1],b[1]);
    });
    as = view.selectAll("a")
        .data(topics);

    as.enter().append("a");
    as.exit().remove();

    as
        .text(function(d) {
            return "Ranked " + (d[1] + 1) // user-facing rank is 1-based
                + " in " + topic_label(m,d[0],VIS.overview_words);
        })
        .attr({ href: "#" })
        .on("click",function(d) {
            topic_view(m,d[0]);
        });

        
    // ready
    view.classed("hidden",false);

    // (later: time graph)
};

var doc_view = function(m,doc) {

    console.log("View for doc " + doc);
    // get top topics
    // TODO implement
    //
    // (later: nearby documents)
};

var overview = function(m) {
    var ps;

    hide_views();

    console.log("Overview");

    if(!VIS.overview_ready) {

        as = d3.select("div#overview")
            .selectAll("a")
            .data(d3.range(m.n));

        as.enter().append("a");

        as.exit().remove();

        as.text(function (t) {
            var label;
            
            label = topic_label(m,t,VIS.overview_words);
            label += " (α = " + VIS.float_format(m.alpha[t]) + ")";
            return label;
        });

        as.attr({ href: "#" });

        as.on("click",function(t) {
            topic_view(m,t);
        });

        VIS.overview_ready = true;
    }

    d3.select("div#overview")
        .classed("hidden",false);

    // (later: word clouds)
    // (later: grid of time graphs)
    // (later: multi-dimensional scaling projection showing topic clusters)
};

// visualization object and parameters
// -----------------------------------

var VIS = {
    overview_words: 15,
    topic_view_words: 50,
    topic_view_docs: 10,
    overview_ready: false,
    float_format: function(x) {
        return d3.round(x,3);
    }
};

var hide_views = function() {
    var views,selector;
    views = [
        "overview",
        "topic_view",
        "doc_view",
        "word_view"
    ];

    for(i = 0;i < views.length;i++) {
        selector = "div#" + views[i];
        d3.select(selector)
            .classed("hidden",true);
    }
};

// initialization
// --------------

var setup_vis = function(m) {
    // Make overview link clickable

    d3.select("a#overview_link")
        .on("click",function() {
            overview(m);
        });

    // load model information and stick it in page header elements

    d3.select("header h1")
        .text(m.model_meta.title);
    d3.select("div#meta_info")
        .html(m.model_meta.meta_info);

};

var read_files = function(ready_callback) {
    var m;

    m = Model();

    // read some explanatory info about the model
    d3.json("data/model_meta.json",function (d) {
        m.model_meta = d;

        console.log("Read model_meta.json");

        // read topic-words (but only N most probable) as d3.maps()s
        d3.csv("data/keys.csv",
            function(d) {   // d3.csv accessor
                
                t = +d.topic - 1;   // topics indexed from 1 in keys.csv

                if(!m.tw[t]) {
                    m.tw[t] = d3.map();
                }
                m.tw[t].set(d.word,+d.weight);
                // TODO should precalculate ranks here...? or save memory?

                // read topic alpha value

                if(m.alpha[t]===undefined) {
                    m.alpha[t] = parseFloat(d.alpha);
                }
            },
            function(d) {   // d3.csv callback
                // set topic count
                m.n = m.tw.length;

                // set count of number of top words given
                m.n_top_words = m.tw[0].keys().length;

                console.log("Read keys.csv: " + m.n + " topics");

                // read doc-topics
                d3.text("data/dt.csv",function (dt_text) {
                    m.dt = d3.csv.parseRows(dt_text,function(row,j) {
                        return row.map(function (x) { return +x; });
                    });

                    console.log("Read dt.csv: " + m.dt.length + " docs");

                    // precalculate doc lengths
                    m.doc_len = m.dt.map(function(d) { return d3.sum(d); });

                    d3.text("data/cites.txt",function (cites_text) {
                        m.cites = cites_text.trim().split("\n");

                        console.log("Read cites.txt: " + m.cites.length
                            + " citations");

                        d3.text("data/uris.txt",function (uris_text) {
                            m.uris = uris_text.trim().split("\n");

                            console.log("Read uris.txt: " + m.uris.length
                                + " URIs");
                            return ready_callback(m);
                        });
                    });
                }); // d3.text("data/dt.csv",...

            }); // d3.csv("data/keys.csv",...
    }); // d3.json("data/model_meta.json",...
}; // read_files()


// main
// ----

var main = function() {
    read_files(function(model) {
        setup_vis(model);
        overview(model);
    });
};

// execution

main();
