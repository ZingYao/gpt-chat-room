import { useEffect, useState } from 'react';
import {
  Form,
  Dialog,
  Input,
  Select,
  SelectValue,
  Textarea,
} from 'tdesign-react';
import { OpenAiGetModelList } from '../../../wailsjs/go/main/App';
type NewConversationPropsType = {
  isEdit: boolean;
  visible: boolean;
  info: ConversationInfoType;
  modelList: string[];

  onClose: () => void;
  onConfirm: (newConversation: ConversationInfoType) => void;
};

export type ConversationInfoType = {
  uuid: string;
  title: string;
  characterSetting: string;
  model: string;
};

const { Option } = Select;
const { FormItem } = Form;

export default function NewConversation(props: NewConversationPropsType) {
  const { isEdit, visible, info, modelList, onClose, onConfirm } = props;

  const [form] = Form.useForm();

  const [ modeOptions , setModeOptions ] = useState<{value:string, label: string}[]>([])


  useEffect(() => {
    if (visible) {
      if(isEdit) {
        form.setFields([
          {
            name: 'model',
            value: info.model,
          },
          {
            name: 'title',
            value: info.title,
          },
          {
            name: 'characterSetting',
            value: info.characterSetting,
          },
        ]);
      } else {
        form.setFields([
          {
            name: 'model',
            value: info.model,
          },
        ]);
      }

    }
  }, [visible]);

  const _onConfirm = async () => {
    try {
      const formValidata = await form.validate();

      if (formValidata.valueOf()) {
        var newConversation: ConversationInfoType = {
          ...info,
          title: form.getFieldValue('title') as string,
          characterSetting: form.getFieldValue('characterSetting') as string,
          model: form.getFieldValue('model') as string,
        };

        onConfirm(newConversation);
        form.reset();
      }
    } catch (error) {}
  };
  
  const [modeLoading, setModeLoading ] = useState(false)
  const getModeList =() => {
    const t = setTimeout(() => {
      setModeLoading(true);
    }, 200);
    OpenAiGetModelList().then((list: string[]) => {
      setModeOptions(modelList.map((mode)=>{
        return {
          value: mode,
          label: mode,
        }
      }))   
    }).finally(()=>{
      clearTimeout(t);
      setModeLoading(false);
    })
  }

  useEffect(() => {
    setModeOptions(modelList.map((mode)=>{
      return {
        value: mode,
        label: mode,
      }
    }))
  }, [modelList])


  useEffect(()=>{
    getModeList();
  }, [])


  return (
    <Dialog
      header={isEdit ? '编辑会话' : '新建会话'}
      visible={visible}
      onClose={() => {
        form.reset();
        onClose();
      }}
      onConfirm={() => {
        _onConfirm();
      }}
    >
      <Form
        form={form}
        colon
        labelWidth={100}
        labelAlign="top"
        initialData={info}
      >
        <FormItem label="会话标题" name="title" rules={[{ required: true }]}>
          <Input />
        </FormItem>
        <FormItem
          label="会话人设"
          name="characterSetting"
          rules={[{ required: true }]}
        >
          <Textarea
            autosize={{ minRows: 2, maxRows: 5 }}
            placeholder="会话人设"
          ></Textarea>
        </FormItem>
        <FormItem label="会话模型" name="model" rules={[{ required: true }]}>
          <Select placeholder="会话模型" filterable options={modeOptions} loading={modeLoading}>
          </Select>
        </FormItem>
      </Form>
    </Dialog>
  );
}
