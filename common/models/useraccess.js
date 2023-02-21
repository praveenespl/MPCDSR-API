'use strict';
var app=require('../../server/server')
var ObjectId = require('mongodb').ObjectID;

module.exports = function(Useraccess) {
    Useraccess.updateUserAccess = async function(param) {
        const self = this;
         const userAccessModel = self.getDataSource().connector.collection(Useraccess.modelName);
        const user=app.models.usermaster;
        const userData=await user.find({"where":{"usertype":"MDSR","designation":"FNO"}} )
        console.log(userData.length)
        for (let index = 0; index < userData.length; index++) {
            const userId=userData[index].id;
        const url= { 

            header: { 
            
            self: {}, 
            
            items: [ 
            
            { 
            
            title: 'MDSR', 
            
            root: true, 
            
            alignment: 'left', 
            
            toggle: 'click', 
            
            submenu: [ 
            
            { 
            
            bullet: 'dot', 
            
            title: 'Form 1: Notification Card', 
            
            page: '/mdsr/form1' 
            
            }, 
            
            { 
            
            bullet: 'dot', 
            
            title: 'Form 3: MDR Line Listing', 
            
            page: '/mdsr/form3' 
            
            }, 
            
            { 
            
            bullet: 'dot', 
            
            title: 'Form 4: Maternal Death Review', 
            
            page: '/mdsr/form4' 
            
            }, 
            
            { 
            
            bullet: 'dot', 
            
            title: 'Form 6: MDR Case Summary', 
            
            page: '/mdsr/form6' 
            
            } 
            
            ] 
            
            }, 
            
            { 
            
            title: 'Reports', 
            
            root: true, 
            
            alignment: 'left' 
            
            }, 
            
            { 
            
            title: 'Resources', 
            
            root: true, 
            
            alignment: 'left', 
            
            page: '/mdsr/resources' 
            
            }, 
            
            { 
            
            title: 'Orders and directives', 
            
            root: true, 
            
            alignment: 'left' 
            
            }, 
            
            { 
            
            title: 'Review Meetings', 
            
            root: true, 
            
            alignment: 'left' 
            
            } 
            
            ] 
            
            } 
            
            } 
            const form={"items":url}
            
            const data=await userAccessModel.updateOne({"user_id":ObjectId(userId)},{$set:form});
            console.log('--->',userId,'--->',data)
        }
        //  const data=await userAccessModel.find({});
        // console.log(data);
        const aniket={"aniket":"weo"}
        return aniket
        
          }
        
          Useraccess.remoteMethod(
            'updateUserAccess', {
                description: 'Change User\'s Access - User Defined API',
                accepts: [{ 
                    arg: 'params',
                    type: 'object',
                    http: { source: 'body' }
                }],
                returns: {
                    root: true,
                    type: 'object'
                },
                http: {
                    verb: 'post'
                }
            }
        )
        
};
