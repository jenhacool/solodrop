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
  Icon,
  IndexTable,
  Layout,
  Loading,
  Page,
  Stack,
  TextContainer,
  TextField,
  Toast,
  useIndexResourceState,
  Spinner
} from "@shopify/polaris";
import { CircleTickMajor } from '@shopify/polaris-icons';
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
  const [isLoading, setIsLoading] = useState(true);
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
  const [openLicenseKeyPage, setOpenLicenseKeyPage] = useState(false);

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

  // const installTheme = async () => {
  //   let sessionToken = await getSessionToken(app);
  //   setIsLoading(true);
  //   let body = {
  //     shop,
  //   };

  //   try {
  //     let { data } = await axios.post("/api/install_theme", body, {
  //       headers: {
  //         Authorization: `Bearer ${sessionToken}`,
  //       },
  //     });
  //     setIsLoading(false);
  //     setActiveSuccess(4);
  //     let detail = shopData.detail;
  //     let newShopData = {
  //       ...shopData,
  //       detail: {
  //         ...detail,
  //         theme_installed: true
  //       },
  //       theme_deleted: false
  //     }
  //     setShopData(newShopData);
  //   } catch (error) {
  //     setIsLoading(false);
  //   }
  // };

  const installTheme = () => {
    window.open(`https://solodrop.com`, '_blank', 'noopener,noreferrer');
  }

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

  const openInstalledThemes = () => {
    window.open(`https://${shop}/admin/themes`, '_blank', 'noopener,noreferrer');
  }

  const getPageContentClassname = () => {
    if (shopData.invalid) {
      return "invalid";
    } else if (!shopData.detail.theme_installed) {
      return "not-installed";
    } else if (shopData.theme_deleted) {
      return "theme-deleted";
    } else {
      return "installed";
    }
  };

  const Invalid = () => {
    return (
      <Layout.Section>
        <Card sectioned>
          <div className="card">
            <h2 className="title">Hmm. Looks like your license is no longer valid.</h2>
            <p>Let's get you back on track! Grab another license from Solodrop to keep the party going.</p>
            <Stack distribution="center">
              <Button primary>Buy a license</Button>
              <Button primary>Contact Support</Button>
            </Stack>
          </div>
        </Card>
      </Layout.Section>
    )
  }

  const Installed = () => {
    return (
      <>
        <Layout.Section oneThird>
          <Card title="License" sectioned>
            <p>{userInfo.license_key}</p>
          </Card>
        </Layout.Section>
        {shopData.detail.theme_installed && (
          <>
          <Layout.Section oneThird>
          <Card title="Current Version" sectioned>
            {shopData.detail.theme_version}
          </Card>
          </Layout.Section>
          <Layout.Section oneThird>
          <Card title="Latest Version" sectioned>
            <TextContainer>
            <p>{latestVersion}</p>
            {hasUpdate &&
              <Button onClick={updateTheme} primary>Update version</Button>
            }
            </TextContainer>
          </Card>
          </Layout.Section>
          </>
        )}
        <Layout.Section>
          <div className="installed-card">         
            <Card sectioned>
              <div className="card">
                <div className="card-icon">
                  <Icon source={CircleTickMajor} color="success" />
                </div>
                <h2 className="title">Solodrop Installed!</h2>
                {shop &&
                  <Stack distribution="center">
                    <Button onClick={openInstalledThemes} primary>View Installed Themes</Button>
                  </Stack>
                }
              </div>
            </Card>
          </div>
        </Layout.Section>
      </>
    )
  }

  const NotInstalled = () => {
    return (
      <Layout.Section>
        <Card sectioned>
          <div className="card">
            <h2 className="title">You're one click away from elevating your store!</h2>
            <p>Install Solodrop theme on your store now to unlock all of our powerful sales tools.</p>
            <Stack distribution="center">
              <Button primary onClick={installTheme}>Install Solodrop Theme</Button>
            </Stack>
          </div>
        </Card>
      </Layout.Section>
    )
  }

  const ThemeDeleted = () => {
    return (
      <Layout.Section>
        <Card sectioned>
          <div className="card">
            <h2 className="title">You're one click away from elevating your store!</h2>
            <p>Install Solodrop theme on your store now to unlock all of our powerful sales tools.</p>
            <Stack distribution="center">
              <Button onClick={installTheme} primary>Install Solodrop Theme</Button>
            </Stack>
          </div>
        </Card>
      </Layout.Section>
    )
  }

  const buyALicense = () => {
    window.open("https://solodrop.com", '_blank', 'noopener,noreferrer');
  }

  const enterLicenseKey = () => {
    setOpenLicenseKeyPage(true);
  }

  const primaryAction = () => {
    if (shopData.invalid) {
      return {
        content: "Enter License Key", onAction: enterLicenseKey
      }
    }
    return {
      content: "Install Solodrop Theme",
      onAction: installTheme,
      disabled: shopData.detail.theme_installed && shopData.theme_deleted != true,
    }
  }

  const PageContent = () => {
    if (shopData.invalid) {
      return <Invalid />
    } else if (!shopData.detail.theme_installed) {
      return <NotInstalled />
    } else if (shopData.theme_deleted) {
      return <ThemeDeleted />
    } else {
      return <Installed />
    }
  }

  const EnterLicenseKeyPage = () => {
    return (
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
    )
  }

  return (
    <Frame>
      {isLoading ? (
        <Page>
          <Layout>
            <Layout.Section>
              <div className="loading">
              <Spinner />
              </div>
            </Layout.Section>
          </Layout>
        </Page>
      ) : (
        <>
          {openLicenseKeyPage ? (
            <EnterLicenseKeyPage />
          ) : (
            <>
              {shopData && Object.keys(shopData).length > 0 && isActive ? (
                <Page 
                  titleMetadata={
                    <img src="/static/images/logo.svg" width="150" />
                  }
                  primaryAction={primaryAction()}
                >
                  <div className={getPageContentClassname()}>
                    <Layout>
                      <PageContent />
                    </Layout>
                  </div>
                </Page>
              ) : (
                <EnterLicenseKeyPage />
              )}
            </>
          )}
        </>
      )}

      {messageSuccess()}
      {errorMarkup()}
    </Frame>
  );
};

export default Index;
