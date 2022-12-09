import React from "react";
import {
  Button,
  Card,
  FormLayout,
  Layout,
  Page,
  TextField,
} from "@shopify/polaris";

const EnterLicenseKeyPage = (props) => {
  const { licenseKey, disabled, onChangeLicenseKey, onActivate } = props;

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card title="Enter your license code" sectioned>
            <FormLayout>
              <TextField
                value={licenseKey}
                onChange={onChangeLicenseKey}
                autoComplete="off"
                placeholder="License code"
              />
              <Button onClick={onActivate} disabled={disabled} primary>
                Active
              </Button>
            </FormLayout>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default EnterLicenseKeyPage;
