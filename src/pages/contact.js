import React from "react";
import PropTypes from "prop-types";
import injectSheet from "react-jss";
import Obfuscate from "react-obfuscate";

import Main from "../components/Main";
import Article from "../components/Main/Article";
import PageHeader from "../components/Page/PageHeader";
import Content from "../components/Main/Content";
import config from "../../content/meta/config";

const styles = theme => ({});

const SocialLinks = () => {
  const items = config.socialLinks
  return (
    <div>
      <ul>
        {items.map(item => (
          <li key={item.name}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" title={item.name}>
              {item.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

const Contact = () => {
  return (
    <Main>
      <Article>
        <PageHeader title="Lets connect" />
        <Content>
          <p>Some of the web parks I hangout are:</p>
          <SocialLinks />
          If you're looking for my resume, 
          <a href={config.resumeUrl} target="_blank" rel="noopener noreferrer" title="Resume"> here</a> it is.<br/>
          Also, feel free to shoot me an email at <Obfuscate email={config.contactEmail} />
        </Content>
        {/* <Form /> */}
      </Article>
    </Main>
  );
};

Contact.propTypes = {
  classes: PropTypes.object.isRequired
};

export default injectSheet(styles)(Contact);
