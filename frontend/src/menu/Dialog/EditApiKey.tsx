import { useEffect, useState } from "react";
import { Dialog, Form, Input } from "tdesign-react"

type EditApiKeyPropsType = {
  visible: boolean;
  initKey:string;
  

  onClose: () => void;
  onConfirm: (newkey: string) => void;
};

const { FormItem } = Form;

export default function EditApiKey (props:EditApiKeyPropsType) {


  const {visible, initKey, onClose, onConfirm} = props

  const [form] = Form.useForm();

  const initNewKeyValue = () => {
    return initKey.slice(1, 5) + "******" + initKey.slice(initKey.length - 5, initKey.length)
  }

  const [newKey , setNewKey ] = useState('')

  useEffect(() => {
    
    if(visible) {
    
      if(initKey && initKey.length > 0) {
        setNewKey(initNewKeyValue());
        form.setFields([{
          name: 'key',
          value: newKey
        }])
      }
    }
    
  }, [visible])




  const _onConfirm = async () => {
    try {
      const flag = await form.validateOnly()
      console.log("Api key", flag);
      if(flag.valueOf() === true) {
        const _key = form.getFieldValue('key') as string
        
        onConfirm(_key.trim());
        form.reset();
      }
    } catch (error) {
      
    }
  }

  return (
    <Dialog
    header="请输入apikey"
    visible={visible}
    onClose={() =>{
      form.reset();
      onClose()
    }}
    // confirmOnEnter={true}
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
        initialData={{
          'key': initKey
        }}
      >
        <FormItem label="接口 KEY" name="key" rules={[{ required: true, }]}>
          <Input />
        </FormItem>
      </Form>
    {/* <Input
        value={apiKey.length <= 11 ? apiKey : apiKey.slice(1, 5) + "******" + apiKey.slice(apiKey.length - 5, apiKey.length)}
        placeholder="OpenAI Api Key" onChange={(v: string) => {
        setApiKey(v.trim())
    }}></Input> */}
</Dialog>
  )
}