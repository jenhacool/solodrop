import { useAppBridge } from "@shopify/app-bridge-react";
import { getSessionToken } from "@shopify/app-bridge-utils";
import {
  Button, ButtonGroup, Card, FormLayout, Frame, IndexTable, Layout, Loading, Page, TextField, Toast, useIndexResourceState
} from "@shopify/polaris";
import axios from "axios";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useState } from "react";

const Index = () => {
  // const app = useAppBridge();
  const [openEditor, setOpenEditor] = useState(false);
  const [idEdit, setIdEdit] = useState("");
  const [slider, setSlider] = useState([]);
  const [plan, setPlan] = useState("");
  const [selected, setSelected] = useState(0);
  const router = useRouter();
  const [settings, setSettings] = useState([]);
  const [settingId, setSettingId] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [openPicker, setOpenPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [userInfo, setUserInfo] = useState({});
  const [activeError, setActiveError] = useState(false);
  const [activeSuccess, setActiveSuccess] = useState(0);
  const [isOpenModalConfirmDelete, setIsOpenModalConfirmDelete] = useState(
    false
  );
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
  } = useIndexResourceState([]);

  const shop = router.query.shop || "";




  const handleOpenDeleteSetting = (id) => {
    setSettingId(id);
    setIsOpenModalConfirmDelete(true);
  };

  const errorMarkup = useCallback(() => {
    if (activeError) {
      setTimeout(() => {
        setActiveError(false);
      }, 3000);
      return <Toast error={true} content="Server error" />;
    }
  }, [activeError]);

  const messageSuccess = useCallback(() => {
    let message = "";
    switch (activeSuccess) {
      case 1:
        message = "Add new success";
        break;
      case 2:
        message = "Edit success";
        break;
      case 3:
        message = "Delete success";
        break;

      default:
        break;
    }
    if (activeSuccess !== 0 && message) {
      setTimeout(() => {
        setActiveSuccess(0);
      }, 3000);
      return <Toast content={message} />;
    }
  }, [activeSuccess]);

  const getSettings = async () => {
    // let sessionToken = await getSessionToken(app);
    setIsLoading(true);
    let body = {
      shop,
    };

    try {
      let { data } = await axios.post("/api/get-info", body, {
        headers: {
          // Authorization: `Bearer ${sessionToken}`,
        },
      });
      console.log(response)
      // setSettings(response.data.data.settings);
      setUserInfo(data?.data?.userInfo)
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }

  };

  // const saveSettings = async (newSettings) => {
  //   let sessionToken = await getSessionToken(app);

  //   let data = {
  //     shop,
  //     settings: newSettings,
  //   };

  //   try {
  //     let response = await axios.post("/api/settings/save", data, {
  //       headers: {
  //         Authorization: `Bearer ${sessionToken}`,
  //       },
  //     });
  //     if (response) {
  //       return true;
  //     }
  //   } catch (error) {
  //     return false;
  //   }
  // };

  useEffect(() => {
    getSettings();
  }, []);

  if (isLoading) {
    return (
      <div style={{ height: '100px' }}>
        <Frame>
          <Loading />
        </Frame>
      </div>
    )

  }

  return (
    <Frame>
      <Page
      >
        <Layout>
          <Layout.Section>
            {userInfo ? <div className="card">
              <FormLayout>
                <div className="card-header">
                  <h4>Theme Manager</h4>
                  <Button primary>Install Solodrop Theme</Button>
                </div>
                <div className="card-content">
                  <h5>License</h5>
                  <p>aaa</p>
                </div>
                <div className="card-content">
                  <h5>Current version</h5>
                  <p>aaa</p>
                </div>
                <div className="card-content">
                  <h5>Latest version</h5>
                  <p>aaa</p>
                  <Button primary>Update version</Button>
                </div>
              </FormLayout>
            </div> : <div className="card">
              <FormLayout>
                <div className="card-header">
                  <h4>Enter your license code</h4>
                </div>
                <TextField placeholder="License code" />
                <Button primary>Active</Button>
              </FormLayout>
            </div>}

          </Layout.Section>
        </Layout>

      </Page>

      {messageSuccess()}
      {errorMarkup()}
    </Frame>
  );
};

export default Index;
