"use strict";

const { useState, useEffect, useRef, useCallback } = React;

const call = (data) => {
    return fetch('/api', {
        method: 'POST',
        body: JSON.stringify(data)
    });
};

const Info = styled.div`
  color: rgba(0,0,0,.3);
  margin: 1em;
`;

const FeedbackArea = styled.textarea`
  width: 100%;
  height: 120px;
  padding: .5em;
`;

const NoteChoice = styled.div`
  display: flex;
`;

const Zero = styled.div`
  display: inline-block;
  width: 32px;
  height: 32px;
  align-self: center;
  text-align: center;
  border: 2px solid rgba(0,0,0,.6);
  border-radius: 3px;
  margin: 0 4px;
  line-height: 28px;
  font-weight: bold;
  font-size: 20px;
  cursor: pointer;
`;

const PollResults = styled.div`
  margin: 1em;
`;

const Score = styled.div`
  width: 20px;
  text-align: right;
  height: 24px;
  display: inline-block;
  line-height: 24px;
  margin: 0 5px;
  font-weight: bold;
`;

const Value = styled(Score)`
  text-align: center;
  font-weight: normal;
`;

const Bar = styled.div`
  background: black;
  height: 24px;
  display: inline-block;
`;

const Line = styled.div`
  height: 24px;
  display: flex;
  align-content: center;
  margin: 1px 0;
`;

const Warning = styled.div`
  font-style: italic;
  font-size: 80%;
`;

const AdminPanel = styled.div`
  display: flex;
`;

const AdminWidget = styled.div`
  border: 1px solid #ccc;
  border-radius: 3px;
  margin: 1em;
  padding: 0 1em;
  display: inline-flex;
  flex-direction: column;
  width: 400px;
  background: white;
  box-shadow: 2px 2px 4px rgba(0,0,0,.05);
`;

const Flex = styled.div`
  flex: 1;
`;

const AdminContainer = styled.div`
  border-top: 1px solid rgba(0,0,0,.3);
  border-bottom: 1px solid rgba(0,0,0,.3);
  background: #f8f8f8;
`;

const Container = styled.div`
  width: 800px;
  background: #eee;
  border: 1px solid black;
  color: black;
  margin: 2em;
  border-radius: .5em;
  box-shadow: 10px 10px 30px rgba(0,0,0,.4);
`;

const Title = styled.h1`
  text-align: center;
  padding: 1em;
  margin: 0;
  background: rgba(0,0,0,.05);
  border-bottom: 1px solid rgba(0,0,0,.1);
`;

const Content = styled.div`
`;

const Star = ({highlighted, onClick, note}) => {
    const d = [...Array(5)].map((_, i) => {
        const a = 4 * i * Math.PI / 5;
        return (i?'L':'M') + (Math.sin(a)*12+16) + ',' + (-Math.cos(a)*12+16);
    }).join('') + 'Z';
    const s1 = <path d={d} stroke="black" strokeWidth="3" fill="none" strokeLinejoin="round"/>;
    const s2 = <path d={d} fill={highlighted?"yellow":"#666"}/>;
    return <svg style={{cursor: 'pointer'}}data-note={note} onClick={onClick} width="32" height="32">{s1}{s2}</svg>;
};

const Feedback = ({subject, userKey, lastOne}) => {
    const [submitted, setSubmitted] = useState(false);
    const textRef = useRef(null);
    const [note, setNote] = useState(0);
    const handleChange = useCallback(() => {
        setSubmitted(false);
    }, []);
    const handleNoteChange = useCallback(event => {
        const n = +event.currentTarget.dataset.note;
        if (n !== note) {
            setNote(n);
            setSubmitted(false);
        }
    }, [note]);
    const onPostFeedback = (event) => {
        event.preventDefault();
        const text = textRef.current.value;
        call({action: 'post-feedback', key: userKey, text, note})
            .then(() => {
                setSubmitted(true);
            }).catch(() => {
                alert('ERROR: Failed to send feedback!');
            });
    };
    return (
        <form onSubmit={onPostFeedback} style={{margin: '1em'}}>
            <h2>Subject: {subject}</h2>
            <NoteChoice>
                <span style={{lineHeight: '32px'}}>Note:</span>
                <Zero data-note="0" onClick={handleNoteChange}>0</Zero>
                {[...Array(5)].map((_, i) => <Star key={i+1} highlighted={i+1<=note} note={i+1} onClick={handleNoteChange} />)}
                <span style={{marginLeft: '1em', fontWeight: 'bold', fontSize: '20px', lineHeight: '32px'}}> {note} / 5</span>
            </NoteChoice>
            <p>Your feedback:</p>
            <p><FeedbackArea key={subject} ref={textRef} onChange={handleChange}/></p>
            {submitted && <p style={{color: '#080'}}>Feedback sent to the poll.</p>}
            {!submitted
             && <p>
                  <button>Submit</button>
                  {lastOne && <span style={{fontStyle:'italic'}}> (You are the last one)</span>}
                </p>}
        </form>
    );
};

const Pending = ({received, expected}) => {
    return <p style={{margin: '1em'}}>Responses: {received} / Participants: {expected}</p>;
};

const Histogram = ({data}) => {
    const max = Math.max(1, Math.max(...data));
    return (
        <div>
            {data.map((n, i) => (
                <Line key={i}>
                    <Score>{i}</Score>
                    <Bar style={{width: Math.max(2, 500*n/max) + 'px'}} />
                    <Value>{n}</Value>
                </Line>
            ))}
        </div>
    );
};

const Results = ({subject, items, histogram}) => {
    if (histogram == null && (!items || !items.length)) return null;
    return (
        <PollResults>
            <p style={{fontWeight: 'bold'}}>Poll result for {subject}:</p>
            {histogram != null && <Histogram data={histogram} />}
            <ul>{items.map((value, i) => <li key={i}>{value}</li>)}</ul>
        </PollResults>
    );
};

const Admin = () => {
    const [showAdmin, setShowAdmin] = useState(false);
    const subjectRef = useRef(null);
    const onChangeSubject = useCallback(event => {
        event.preventDefault();
        const subject = subjectRef.current.value;
        call({action: 'new-poll', subject});
        setShowAdmin(false);
    }, []);
    const onForceResults = useCallback(event => {
        event.preventDefault();
        call({action: 'force-results'});
        setShowAdmin(false);
    }, []);
    const toggleShowAdmin = useCallback(() => {
        setShowAdmin(!showAdmin);
    }, [showAdmin]);
    return (
        <AdminContainer>
            <p style={{margin: '1em', textAlign: 'right'}}><button onClick={toggleShowAdmin}>Toggle admin</button></p>
            {showAdmin &&
            <AdminPanel>
                <AdminWidget>
                    <form onSubmit={onChangeSubject}>
                        <p style={{fontWeight: 'bold'}}>New poll</p>
                        <p>Subject: <input ref={subjectRef} type="text" /></p>
                        <Warning><p>This will reset all user sessions.</p></Warning>
                        <p><button>Create</button></p>
                    </form>
                </AdminWidget>
                <AdminWidget>
                    <p style={{fontWeight: 'bold'}}>Finish</p>
                    <Flex />
                    <form onSubmit={onForceResults}>
                        <Warning>
                            <p>
                                This will force the display of received results,
                                even if some are missing.
                            </p>
                        </Warning>
                        <p><button>Force Results</button></p>
                    </form>
                </AdminWidget>
            </AdminPanel>}
        </AdminContainer>
    );
};

const useUserKey = () => {
    const [key, setKey] = useState(null);
    useEffect(() => {
        if (localStorage.getItem('key') === null) {
            localStorage.setItem('key', (Math.random() * 1e9 | 0).toString());
        }
        setKey(localStorage.getItem('key'));
    }, []);
    return key;
};

const Intro = () => {
    return <p style={{margin: '1em'}}>Waiting for the admin to create a poll.</p>;
};

const Root = () => {
    const [currentState, setCurrentState] = useState('unsynchronized');
    const [subject, setSubject] = useState(null);
    const [pending, setPending] = useState({});
    const [results, setResults] = useState({});
    const key = useUserKey();
    useEffect(() => {
        const connect = () => {
            call({action: 'declare-key', key: localStorage.getItem('key')});
            const eventSource = new EventSource('/event');
            eventSource.addEventListener('error', e => {
                eventSource.close();
                setTimeout(connect, 1000);
            });
            eventSource.addEventListener('message', e => {
                // First message after connecting is full state
                const message = JSON.parse(e.data);
                console.log('Message:', message);
                if ('state' in message)
                    setCurrentState(message.state);
                if ('subject' in message)
                    setSubject(message.subject);
                if ('pending' in message)
                    setPending(message.pending);
                if ('results' in message)
                    setResults(message.results);
            });
        };
        connect();
    }, []);
    const showIntro = currentState === 'initial';
    const showFeedback = currentState === 'feedback';
    const showReview = currentState === 'review';
    return (
        <Container>
            <Title>RetroPoll</Title>
            <Content>
                {showIntro && <Intro />}
                {showFeedback && <Pending {...pending} />}
                {showFeedback &&
                 <Feedback userKey={key} subject={subject}
                           lastOne={pending.expected-pending.received===1}/>}
                {showReview && <Results {...results} />}
                <Admin />
                <Info>
                    <p>State: {currentState}</p>
                    <p>Key: {key}</p>
                </Info>
            </Content>
        </Container>
    );
};

window.onload = ReactDOM.render(<Root />, document.getElementById('root'));
