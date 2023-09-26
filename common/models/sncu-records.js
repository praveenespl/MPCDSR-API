'use strict';
const axios = require("axios");
const app = require("../../server/server");
// fetch data from third party api
const congif = {
  headers: {
    ApiKey: "40d1d2676e0cea032d9203a109edb116a3",
  },
};
const getData = async () => {
  try {
    const res = await axios.get(
      `https://sncuindiaonline.org/SNCUAPI/api/v1/patients_custom?date=14-09-2023`,
      congif
    );
    return res.data.data;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};
module.exports = function (Sncurecords) {
  Sncurecords.getSnCUData = async function () {
    const cdrFormOneCollection = app.models.cdr_form_1;
    const cdrFormOneModel = Sncurecords.getDataSource().connector.collection(app.models.cdr_form_1.modelName);
    const sncuModel = this.getDataSource().connector.collection(app.models.sncu_records.modelName);
    const sncuCollection = app.models.sncu_records;
    const stateCollection = app.models.state;
    const districtCollection = app.models.district;
    const blockCollection = app.models.subdistrict;
    try {
      const sncuData = await getData();
      let stateCode, districtCode, districtName = "";
      sncuData?.map(async (record) => {
        try {
          const state = await stateCollection.find({});
          const foundState = state.find((x) => x.statename.toLowerCase() == record.sncu_state.toLowerCase());
          const district = await districtCollection.find({ stateCode: foundState?.statecode });
          const foundDistrict = district.find((x) => x.districtname.toLowerCase() == record.sncu_district.toLowerCase());
          if (foundDistrict) {
            districtCode = foundDistrict?.districtcode;
            districtName = foundDistrict?.districtname;
          }

          const districtDetail = district.find((x) => x.districtcode == districtCode && x.districtname == districtName && x.districtname == districtName)
          const blockDetails = await blockCollection.find({ where: { districtcode: districtCode, statecode: foundState?.statecode, districtname: districtName } });
          const block = blockDetails?.find(x => x.subdistrictname == record.permanent_block);
          if (districtCode && districtName && block?.subdistrictcode) {
            const new_form = {
              notification_received_date: new Date(record?.admision_date)?.toISOString(),
              notification_received_person_name:
                record?.discharge_doctor_incharge,
              name: record?.mother_name,
              date_of_birth: new Date(record?.baby_date_of_birth)?.toISOString(),
              createdBy: "",
              age: record?.baby_age_admission_time,
              sex:
                record?.baby_sex == "M"
                  ? "Male"
                  : record?.baby_sex == "F"
                    ? "Female"
                    : "Ambiguous",
              mother_name: record?.mother_name,
              father_name: record?.father_name,
              address: {
                colony: "",
                house_number: "",
                pincode: "",
                landmark: "",
                statecode: foundState?.statecode,
                statename: foundState?.statename,
                districtcode: districtDetail?.districtcode,
                districtname: districtDetail?.districtname,
                subdistrictcode: block?.subdistrictcode,
                subdistrictname: block?.subdistrictname,
                villagecode: record?.current_district_id,
                villagename: record?.current_village,
              },
              sncu_address: {
                colony: "",
                house_number: "",
                pincode: "",
                landmark: "",
                statecode: stateCode,
                statename: record?.sncu_state,
                districtcode: districtCode,
                districtname: record?.current_district,
                subdistrictcode: record?.current_block_id,
                subdistrictname: record?.current_block,
                villagecode: "",
                villagename: record?.current_village,
              },
              landline: "",
              mobile: record?.contact_number1,
              date_of_death: new Date(record?.discharge_modified_date)?.toISOString(),
              palce_of_death: "Hospital",
              actual_palce_of_death: "",
              hospital_name: {
                health_facility_name: record?.sncu_name,
              },
              primary_informant_name: record?.contact_name1,
              time: new Date(record?.discharge_date)?.toISOString(),
              date_of_notification: new Date(record?.admision_date)?.toISOString(),
              createdAt:new Date(record?.discharge_date)?.toISOString(),
              updatedAt: new Date(record?.discharge_date)?.toISOString(),
              statecode: foundState?.statecode,
              districtcode: districtDetail?.districtcode,
              subdistrictcode: block?.subdistrictcode,
              villagecode: "",
              discharge_date: new Date(record?.discharge_date)?.toISOString(),
              discharge_doctor_incharge_id:
                record?.discharge_doctor_incharge_id,
              sncu_surname: record?.surname,
              sncu_category: record?.category,
              sncu_baby_weight: record?.baby_weight_on_admission_kgs,
              sncu_other_district_admission: record?.other_district_admission,
              sncu_current_address: record?.current_address,
              sncu_permanent_center_id: record?.permanent_center_id,
              sncu_contact_relation1: record?.contact_relation1,
              sncu_permanent_address: record?.permanent_address,
              sncu_discharge_bcg: record?.discharge_bcg,
              sncu_discharge_outcome: record?.discharge_outcome,
              sncu_center_id: record?.sncu_center_id,
              sncu_contact_name2: record?.contact_name2,
              sncu_contact_number2: record?.contact_number2,
              sncu_contact_relation2: record?.contact_relation2,
              sncu_discharge_modified_date: new Date(record?.discharge_modified_date)?.toISOString()
            };
            //console.log("successfully mapped", new_form)
            //await sncuModel.insertOne(new_form);
            await cdrFormOneModel.insertOne(new_form);
          }
        } catch (error) {
          console.log("error while adding record", error);
        }
      });
      return sncuData;
    } catch (error) {
      console.log("error", error);
    }
  }
  Sncurecords.remoteMethod("getSnCUData", {
    description: "Get SnCUData from third party API",
    returns: {
      root: true,
      type: "array",
    },
    http: {
      verb: "get",
    },
  });
};
