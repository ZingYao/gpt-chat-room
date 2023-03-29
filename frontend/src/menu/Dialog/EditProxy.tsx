import {useEffect, useState} from 'react';
import { Button, Dialog, Form, Input, MessagePlugin, } from 'tdesign-react';
import { UtilCheckProxy } from '../../../wailsjs/go/main/App';

type EditProxyPropsType = {
  visible: boolean;
  initProxyTestAddr: string;
  proxyAddr: string;
  onClose: () => void;
  onConfirm: (newkey: string) => void;
};

const { FormItem } = Form;

const EditProxy = (props: EditProxyPropsType) => {
  const [form] = Form.useForm();

  const { visible, initProxyTestAddr,proxyAddr, onClose, onConfirm } = props;

  const [proxyTestAddr, setProxyTestAddr] = useState(initProxyTestAddr);

  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    form.setFields([{
      name:"proxy",
      value:proxyAddr
    }])
  },[proxyAddr])

  const _onConfirm = async () => {
    try {
      const flag = await form.validate();
      if (flag.valueOf() === true) {
        const _proxy = form.getFieldValue('proxy') as string;

        onConfirm(_proxy);
        form.reset();
      }
    } catch (error) {}
  };

  return (
    <Dialog
      header="请输入apikey"
      visible={visible}
      onClose={() => {
        form.reset();
        onClose();
      }}
      onConfirm={() => {
        _onConfirm();
      }}
      style={{
        textAlign: 'left',
      }}
    >
      <Form
        form={form}
        colon
        labelWidth={100}
        labelAlign="top"
        style={{
          paddingBottom: '2rem',
        }}
        initialData={{
          proxy:proxyAddr
        }}
      >
        <FormItem label="代理地址" name="proxy" >
          <Input />
        </FormItem>
      </Form>
      <Input
        value={proxyTestAddr}
        style={{ width: '70%', float: 'left' }}
        onChange={setProxyTestAddr}
      ></Input>
      <Button
        loading={testLoading}
        style={{ float: 'right', width: '30%' }}
        onClick={() => {


          form.validate().then((flag) => {
            if(flag === true) {
              const t = setTimeout(() => {
                setTestLoading(true);
              }, 200);
    
              const proxyAddr = form.getFieldValue('proxy') as string
              UtilCheckProxy(proxyAddr, proxyTestAddr)
              .then((rsp: string) => {
                MessagePlugin.info(rsp);
              })
              .finally(() => {
                clearTimeout(t);
                setTestLoading(false);
              });
            }
          })

        }}
      >
        检查连通性
      </Button>
    </Dialog>
  );
};

export default EditProxy;
