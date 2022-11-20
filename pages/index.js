import { useAppBridge } from "@shopify/app-bridge-react";
import { getSessionToken } from "@shopify/app-bridge-utils";
import {
  Badge,
  Banner,
  Button,
  ButtonGroup,
  Card,
  FormLayout,
  Frame,
  IndexTable,
  Layout,
  Loading,
  Page,
  TextContainer,
  TextField,
  Toast,
  useIndexResourceState,
} from "@shopify/polaris";
import axios from "axios";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useState } from "react";
import { compareVersions } from 'compare-versions';

const Index = () => {
  const app = useAppBridge();
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
  const [errorMessage, setErrorMessage] = useState("");
  const [activeSuccess, setActiveSuccess] = useState(0);
  const [isOpenModalConfirmDelete, setIsOpenModalConfirmDelete] = useState(
    false
  );
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
  } = useIndexResourceState([]);

  const [licenseKey, setLicenseKey] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [shopData, setShopData] = useState({})
  const [latestVersion, setLatestVersion] = useState("");
  const [hasUpdate, setHasUpdate] = useState(false);

  const shop = router.query.shop || "";

  const handleOpenDeleteSetting = (id) => {
    setSettingId(id);
    setIsOpenModalConfirmDelete(true);
  };

  const errorMarkup = useCallback(() => {
    if (activeError) {
      setTimeout(() => {
        setActiveError(false);
        setErrorMessage("");
      }, 3000);
      return <Toast error={true} content={errorMessage} />;
    }
  }, [activeError, errorMessage]);

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
      case 4:
        message = "Theme installed";
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
    let sessionToken = await getSessionToken(app);
    setIsLoading(true);
    let body = {
      shop,
    };

    try {
      let { data } = await axios.post("/api/get_info", body, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      console.log(data?.data?.userInfo);
      setUserInfo(data?.data?.userInfo);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };

  const getThemeVersion = async () => {
    let sessionToken = await getSessionToken(app);
    setIsLoading(true);

    let body = {}

    try {
      let { data } = await axios.post("/api/check_theme", body, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      setLatestVersion(data?.data?.version);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };

  const getShop = async () => {
    let sessionToken = await getSessionToken(app);
    setIsLoading(true);
    let body = {
      shop,
    };

    try {
      let { data } = await axios.post("/api/get_shop", body, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      setIsActive(data?.data?.shopData.active);
      setShopData(data?.data?.shopData);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };

  const checkThemeUpdate = () => {
    setHasUpdate(compareVersions(latestVersion, shopData.detail.theme_version) > 0)
  }

  useEffect(() => {
    getShop();
    if (isActive) {
      getSettings();
      getThemeVersion();
    }
  }, [isActive]);

  useEffect(() => {
    if (latestVersion && shopData.detail.theme_version) {
      checkThemeUpdate();
    }
  }, [latestVersion, shopData]);

  const handleChangeLicenseKey = useCallback(
    (newValue) => setLicenseKey(newValue),
    []
  );

  const activateLicense = async () => {
    let sessionToken = await getSessionToken(app);

    setIsLoading(true);

    let body = {
      shop,
      license_key: licenseKey,
    };

    try {
      let response = await axios.post("/api/activate_license", body, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      setIsLoading(false);
      setIsActive(true);
      setUserInfo(response?.data?.data?.userInfo);
    } catch (error) {
      setIsLoading(false);
      setActiveError(true);
      setErrorMessage(error?.response?.data?.message);
    }
  };

  const installTheme = async () => {
    let sessionToken = await getSessionToken(app);
    setIsLoading(true);
    let body = {
      shop,
    };

    try {
      let { data } = await axios.post("/api/install_theme", body, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      setIsLoading(false);
      setActiveSuccess(4);
    } catch (error) {
      setIsLoading(false);
    }
  };

  const updateTheme = async () => {
    let sessionToken = await getSessionToken(app);
    setIsLoading(true);
    let body = {
      shop,
    };

    try {
      let { data } = await axios.post("/api/update_theme", body, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      setIsLoading(false);
      setActiveSuccess(4);
    } catch (error) {
      setIsLoading(false);
    }
  };

  return (
    <Frame>
      {isLoading && <Loading />}
      {shopData && Object.keys(shopData).length > 0 && isActive ? (
        <Page
          narrowWidth={true}
          title="Theme Manager"
          primaryAction={{ content: "Install Solodrop Theme", onAction: installTheme }}
        >
          <Layout>
            <Layout.Section>
              <Card title="License" sectioned>
                <p>{userInfo.license_key}</p>
              </Card>
              {shopData.detail.theme_installed && (
                <>
                <Card title="Current Version" sectioned>
                  {shopData.detail.theme_version}
                </Card>
                <Card title="Latest Version" sectioned>
                  <TextContainer>
                  <p>{latestVersion}</p>
                  {hasUpdate &&
                    <Button onClick={updateTheme} primary>Update version</Button>
                  }
                  </TextContainer>
                </Card>
                </>
              )}
            </Layout.Section>
          </Layout>
        </Page>
      ) : (
        <Page>
          <Layout>
            <Layout.Section>
        <Card title="Enter your license code" sectioned>
          <FormLayout>
            <TextField
              value={licenseKey}
              onChange={handleChangeLicenseKey}
              autoComplete="off"
              placeholder="License code"
            />
            <Button onClick={activateLicense} disabled={isLoading} primary>
              Active
            </Button>
          </FormLayout>
        </Card>
        </Layout.Section>
          </Layout>
        </Page>
      )}

      {messageSuccess()}
      {errorMarkup()}
    </Frame>
  );
};

export default Index;
